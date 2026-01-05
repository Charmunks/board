require("dotenv").config();
const express = require("express");
const nunjucks = require("nunjucks");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const path = require("path");

const authRoutes = require("./routes/auth");
const messagesRoutes = require("./routes/messages");
const profileRoutes = require("./routes/profile");

const app = express();
const PORT = process.env.PORT || 3000;

const nunjucksEnv = nunjucks.configure(path.join(__dirname, "views"), {
  autoescape: true,
  express: app,
  watch: process.env.NODE_ENV !== "production",
});

nunjucksEnv.addFilter("date", (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    store: new pgSession({
      conObject: {
        connectionString:
          process.env.DATABASE_URL ||
          "postgresql://postgres:postgres@localhost:5432/express_app",
      },
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.userId
    ? { id: req.session.userId, username: req.session.username }
    : null;
  next();
});

const limiter = rateLimit({
  windowMs: 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});

app.use(limiter);

app.use("/auth", authRoutes);
app.use("/messages", messagesRoutes);
app.use("/profile", profileRoutes);

app.get("/", (req, res) => {
  res.redirect("/messages");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
