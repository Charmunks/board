require("dotenv").config();
const { pool } = require("../sql");

async function setup() {
  console.log("Setting up message board tables...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      "messageId" INTEGER REFERENCES messages(id) ON DELETE CASCADE,
      "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      "messageId" INTEGER REFERENCES messages(id) ON DELETE CASCADE,
      "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER CHECK (value IN (-1, 1)),
      UNIQUE("messageId", "userId")
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reactions (
      id SERIAL PRIMARY KEY,
      "messageId" INTEGER REFERENCES messages(id) ON DELETE CASCADE,
      "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
      emoji VARCHAR(10) NOT NULL,
      UNIQUE("messageId", "userId", emoji)
    )
  `);

  console.log("Message board tables created successfully!");
  process.exit(0);
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
