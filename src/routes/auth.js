const express = require("express");
const bcrypt = require("bcrypt");
const { query, queryOne, rawQuery } = require("../sql");

const router = express.Router();
const SALT_ROUNDS = 10;

router.get("/login", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  res.render("auth/login.njk", { title: "Login" });
});

router.get("/signup", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  res.render("auth/signup.njk", { title: "Sign Up" });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await queryOne(
      `Find a user by username "${username}". Return all columns.`
    );

    if (!user) {
      return res.render("auth/login.njk", {
        title: "Login",
        error: "Invalid username or password",
      });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.render("auth/login.njk", {
        title: "Login",
        error: "Invalid username or password",
      });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.render("auth/login.njk", {
      title: "Login",
      error: "An error occurred. Please try again.",
    });
  }
});

router.post("/signup", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render("auth/signup.njk", {
      title: "Sign Up",
      error: "Passwords do not match",
    });
  }

  if (password.length < 8) {
    return res.render("auth/signup.njk", {
      title: "Sign Up",
      error: "Password must be at least 8 characters",
    });
  }

  try {
    const existingUser = await queryOne(
      `Find a user where username is "${username}" or email is "${email}". Return all columns.`
    );

    if (existingUser) {
      return res.render("auth/signup.njk", {
        title: "Sign Up",
        error: "Username or email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const users = await rawQuery(
      `INSERT INTO users (username, email, "passwordHash") VALUES ($1, $2, $3) RETURNING id, username`,
      [username, email, passwordHash]
    );
    const user = users[0];

    req.session.userId = user.id;
    req.session.username = user.username;
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.render("auth/signup.njk", {
      title: "Sign Up",
      error: "An error occurred. Please try again.",
    });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/");
  });
});

module.exports = router;
