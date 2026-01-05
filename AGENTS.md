# AI as a Query Builder

An experimental message board where **all SQL queries are AI-generated on the fly**. Instead of writing raw SQL or using an ORM, routes describe queries in natural language and an LLM generates the SQL.

## Project Overview

Express.js web application with Nunjucks templating, PostgreSQL database, and session-based authentication. The core experiment is in `src/sql.js` which uses the Hack Club AI API to convert natural language prompts into SQL queries.

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js 4.x
- **Templating**: Nunjucks (.njk files)
- **Database**: PostgreSQL with raw `pg` driver (no Knex/ORM)
- **Sessions**: express-session with connect-pg-simple
- **Authentication**: bcrypt password hashing
- **AI**: Hack Club AI API (Gemini 3 Flash) for SQL generation
- **Rate Limiting**: express-rate-limit
- **Deployment**: Docker (Coolify-ready)

## Commands

```bash
npm run setup        # Create database tables
npm run dev          # Start with nodemon (hot reload)
npm start            # Production start
```

## Project Structure

```
src/
├── index.js          # App entry point, middleware, Nunjucks config
├── sql.js            # AI SQL generation (query, queryOne, rawQuery)
├── db/
│   └── setup.js      # Table creation script
├── routes/
│   ├── auth.js       # Login, signup, logout
│   └── messages.js   # Message CRUD, comments, votes, reactions
├── views/
│   ├── base.njk      # Base layout
│   ├── auth/         # Login/signup templates
│   ├── messages/     # Message board templates
│   └── macros/       # Reusable template macros
└── public/           # Static assets
```

## Database Schema

- **users** - id, username, email, passwordHash, createdAt, updatedAt
- **messages** - id, userId, title, content, createdAt
- **comments** - id, messageId, userId, content, createdAt
- **votes** - id, messageId, userId, value (-1 or 1)
- **reactions** - id, messageId, userId, emoji
- **session** - sid, sess, expire (managed by connect-pg-simple)

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session signing
- `AI_API_KEY` - Hack Club AI API key for SQL generation
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Code Conventions

- Use camelCase for variables and functions
- Routes in `src/routes/`, export Express Router
- Views use `.njk` extension, extend `base.njk`
- Database foreign keys use `"userId"`, `"messageId"` (quoted, camelCase)
- Use `query()` or `queryOne()` with natural language prompts for AI-generated SQL
- Use `rawQuery()` for sensitive operations (e.g., password inserts)

## AI SQL Module (`src/sql.js`)

- `query(prompt)` - Returns array of rows from AI-generated SELECT
- `queryOne(prompt)` - Returns single row or null
- `rawQuery(sql, params)` - Direct SQL execution (for security-sensitive ops)
- `generateSql(prompt)` - Returns raw SQL string without executing
