const express = require("express");
const { query, queryOne } = require("../sql");

const router = express.Router();

router.get("/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const user = await queryOne(
      `Get user where username is "${username.replace(/"/g, '\\"')}". Return id, username, createdAt.`
    );

    if (!user) {
      return res.status(404).render("profile/show.njk", { 
        title: "User Not Found", 
        error: "User not found" 
      });
    }

    const messages = await query(
      `Get all messages where userId is ${user.id} with vote count (sum of votes.value) and comment count. Order by createdAt descending.`
    );

    res.render("profile/show.njk", {
      title: `${user.username}'s Profile`,
      profile: user,
      messages
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("profile/show.njk", { 
      title: "Error", 
      error: "Failed to load profile" 
    });
  }
});

module.exports = router;
