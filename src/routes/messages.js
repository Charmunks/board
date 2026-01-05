const express = require("express");
const { query, queryOne, rawQuery } = require("../sql");

const router = express.Router();

let messagesCache = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

function invalidateCache() {
  messagesCache = null;
  cacheTime = 0;
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).redirect("/auth/login");
  }
  next();
}

router.get("/", async (req, res) => {
  try {
    if (messagesCache && Date.now() - cacheTime < CACHE_TTL) {
      return res.render("messages/index.njk", { title: "Messages", messages: messagesCache });
    }

    const messages = await rawQuery(`
      SELECT 
        m.id,
        m.title,
        m.content,
        m."createdAt",
        u.username,
        COALESCE(SUM(v.value), 0) AS "voteCount",
        COUNT(DISTINCT c.id) AS "commentCount"
      FROM messages m
      LEFT JOIN users u ON m."userId" = u.id
      LEFT JOIN votes v ON m.id = v."messageId"
      LEFT JOIN comments c ON m.id = c."messageId"
      GROUP BY m.id, u.username
      ORDER BY m."createdAt" DESC
    `);
    
    messagesCache = messages;
    cacheTime = Date.now();
    
    res.render("messages/index.njk", { title: "Messages", messages });
  } catch (err) {
    console.error(err);
    res.render("messages/index.njk", { title: "Messages", messages: [], error: "Failed to load messages" });
  }
});

router.get("/new", requireAuth, (req, res) => {
  res.render("messages/new.njk", { title: "New Message" });
});

router.post("/", requireAuth, async (req, res) => {
  const { title, content } = req.body;
  const userId = req.session.userId;

  if (!title || !content) {
    return res.render("messages/new.njk", { title: "New Message", error: "Title and content are required" });
  }

  try {
    await query(
      `Insert a new message with userId ${userId}, title "${title.replace(/"/g, '\\"')}", and content "${content.replace(/"/g, '\\"')}". Return the id. If the message is inappropriate, malicious, or hateful, instead of the message content and title, put "Don't be mean"`
    );
    invalidateCache();
    res.redirect("/messages");
  } catch (err) {
    console.error(err);
    res.render("messages/new.njk", { title: "New Message", error: "Failed to create message" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId || "NULL";

  try {
    const result = await queryOne(
      `Get message with id ${id} including:
      - author username from users table as "username"
      - vote count (COALESCE sum of votes.value, 0) as "voteCount"
      - current user's vote value (where votes.userId = ${userId}) as "userVote", use NULL if not found
      - JSON array of all comments for this message (each with id, content, createdAt, and author username) as "comments", ordered by createdAt ascending
      - JSON array of emoji reactions grouped with count (each object has emoji and count) as "reactions"
      - JSON array of emoji strings that user ${userId} has reacted with as "userReactions"
      Return a single row with all this data.`
    );

    if (!result) {
      return res.status(404).render("messages/show.njk", { title: "Not Found", error: "Message not found" });
    }

    res.render("messages/show.njk", {
      title: result.title,
      message: result,
      comments: result.comments || [],
      voteCount: result.voteCount || 0,
      reactions: result.reactions || [],
      userVote: result.userVote || 0,
      userReactions: result.userReactions || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("messages/show.njk", { title: "Error", error: "Failed to load message" });
  }
});

router.post("/:id/comments", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.session.userId;

  if (!content) {
    return res.redirect(`/messages/${id}`);
  }

  try {
    await query(
      `Insert a new comment with messageId ${id}, userId ${userId}, and content "${content.replace(/"/g, '\\"')}".`
    );
    invalidateCache();
    res.redirect(`/messages/${id}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/messages/${id}`);
  }
});

router.post("/:id/vote", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;
  const userId = req.session.userId;
  const voteValue = parseInt(value);

  if (voteValue !== 1 && voteValue !== -1) {
    return res.redirect(`/messages/${id}`);
  }

  try {
    const existingVote = await queryOne(
      `Get vote where messageId is ${id} and userId is ${userId}.`
    );

    if (existingVote) {
      if (existingVote.value === voteValue) {
        await query(`Delete vote where messageId is ${id} and userId is ${userId}.`);
      } else {
        await query(`Update vote set value to ${voteValue} where messageId is ${id} and userId is ${userId}.`);
      }
    } else {
      await query(`Insert vote with messageId ${id}, userId ${userId}, and value ${voteValue}.`);
    }
    invalidateCache();
    res.redirect(`/messages/${id}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/messages/${id}`);
  }
});

router.post("/:id/react", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body;
  const userId = req.session.userId;

  if (!emoji) {
    return res.redirect(`/messages/${id}`);
  }

  try {
    const existingReaction = await queryOne(
      `Get reaction where messageId is ${id}, userId is ${userId}, and emoji is "${emoji}".`
    );

    if (existingReaction) {
      await query(`Delete reaction where messageId is ${id}, userId is ${userId}, and emoji is "${emoji}".`);
    } else {
      await query(`Insert reaction with messageId ${id}, userId ${userId}, and emoji "${emoji}".`);
    }
    res.redirect(`/messages/${id}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/messages/${id}`);
  }
});

module.exports = router;
