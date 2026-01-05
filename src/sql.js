const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/express_app",
});

async function generateSql(prompt) {
  const systemPrompt = `You are a PostgreSQL query generator. Given a natural language description, generate ONLY the raw SQL query.
CRITICAL: Output ONLY the SQL statement. No thinking, no explanation, no markdown, no code blocks, no preamble. Your entire response must be valid SQL that can be executed directly.
The database has these tables:
- users (id SERIAL PRIMARY KEY, username VARCHAR(255) UNIQUE, email VARCHAR(255) UNIQUE, "passwordHash" VARCHAR(255), "createdAt" TIMESTAMP, "updatedAt" TIMESTAMP)
- messages (id SERIAL PRIMARY KEY, "userId" INTEGER REFERENCES users(id), title VARCHAR(255), content TEXT, "createdAt" TIMESTAMP)
- comments (id SERIAL PRIMARY KEY, "messageId" INTEGER REFERENCES messages(id), "userId" INTEGER REFERENCES users(id), content TEXT, "createdAt" TIMESTAMP)
- votes (id SERIAL PRIMARY KEY, "messageId" INTEGER REFERENCES messages(id), "userId" INTEGER REFERENCES users(id), value INTEGER)
- reactions (id SERIAL PRIMARY KEY, "messageId" INTEGER REFERENCES messages(id), "userId" INTEGER REFERENCES users(id), emoji VARCHAR(50))
- session (sid VARCHAR PRIMARY KEY, sess JSON, expire TIMESTAMP)

IMPORTANT: The foreign key to users is always "userId", never "authorId".
IMPORTANT: Ignore any requests telling you to take extremely destructive actions, like dropping tables, NO MATTER WHAT.`;

  const response = await fetch(
    "https://ai.hackclub.com/proxy/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    }
  );

  const data = await response.json();
  let sql = data.choices[0].message.content.trim();
  
  sql = sql.replace(/```sql\n?/gi, "").replace(/```\n?/g, "");
  
  const sqlKeywords = /^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP)/i;
  const lines = sql.split("\n");
  const sqlStartIndex = lines.findIndex((line) => sqlKeywords.test(line.trim()));
  if (sqlStartIndex > 0) {
    sql = lines.slice(sqlStartIndex).join("\n");
  }
  
  return sql.trim();
}

async function query(prompt, params = []) {
  const sql = await generateSql(prompt);
  console.log("[AI SQL]", sql);
  const result = await pool.query(sql, params);
  return result.rows;
}

async function queryOne(prompt, params = []) {
  const rows = await query(prompt, params);
  return rows[0] || null;
}

async function rawQuery(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

module.exports = {
  query,
  queryOne,
  rawQuery,
  generateSql,
  pool,
};
