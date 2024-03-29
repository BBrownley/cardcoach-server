require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const usersRouter = require("express").Router();

const usersModel = require("../models/users");

/*

POST /users

Handles registering a user into the system.
Makes a call to the users model to carry out database operations.

if successful, returns an object containing user ID and JWT

if unsuccessful, returns error object with key indicating affected field, and value representing the error message.

*/
usersRouter.post("/", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // server-side validation
  let errors = {};
  let isValid = true;

  const alphanumeric = /^[a-z0-9]+$/i;

  if (!username) {
    errors.username = "Username is required";
    isValid = false;
  } else if (!alphanumeric.test(username)) {
    errors.username = "Username must contain alphanumeric characters only";
    isValid = false;
  } else if (username.length > 20) {
    errors.username = "Username cannot be more than 20 characters";
    isValid = false;
  }

  if (!email) {
    errors.email = "Email is required";
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.email = "Email is invalid";
    isValid = false;
  }

  if (!password) {
    errors.password = "Password is required";
    isValid = false;
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters long";
    isValid = false;
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm password is required";
    isValid = false;
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
    isValid = false;
  }

  // invalid registration, send back err object
  if (!isValid) {
    res.status(422).json(errors);
  } else {
    const hashedPassword = await bcrypt.hash(password, 8);

    try {
      const results = await usersModel.addUser(username, hashedPassword, email);

      // successful registration - pass user id and jwt to client
      const user = { username, id: results.insertId };
      const token = `bearer ${jwt.sign(user, process.env.JWT_SECRET)}`;

      res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days

      res.status(200).json({ id: user.id, username });
    } catch (err) {
      if (err.message.toLowerCase().includes("username")) {
        errors.username = err.message;
      }

      if (err.message.toLowerCase().includes("email")) {
        errors.email = err.message;
      }

      if (err.message.toLowerCase().includes("password")) {
        errors.password = err.message;
      }

      res.status(err.statusCode || 500).json(errors);
    }
  }
});

/*

GET /users/login

Checks if there is a user logged in by checking the precense of an httpOnly cookie and
validating that it is a user JWT

*/

usersRouter.get("/login", async (req, res) => {
  const authHeader = req.cookies?.token;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    try {
      const userInfo = await jwt.verify(token, process.env.JWT_SECRET);

      return res.status(200).json({ loggedIn: true, ...userInfo });
    } catch (err) {
      return res.status(422).json({ error: "invalid user token" });
    }
  }

  return res.status(200).json({ loggedIn: false });
});

/*

POST /users/login

Handles logging a user into the system.
Makes a call to the users model to carry out database operations.

if successful, returns an empty object

if unsuccessful, returns error object with key indicating affected field, and value representing the error message.

*/

usersRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // server-side validation
  let errors = {};
  let isValid = true;

  // Check for empty inputs
  if (!username) {
    errors.username = "Username is required";
    isValid = false;
  }

  if (!password) {
    errors.password = "Password is required";
    isValid = false;
  }

  // invalid login, send back err object
  if (!isValid) {
    res.status(422).json(errors);
  }

  let userRow;

  // login may be valid, check credentials against database entries
  try {
    userRow = await usersModel.findUserByUsername(username);

    const userHashedPW = userRow[0].hashed_password;

    const matchesPW = await bcrypt.compare(password, userHashedPW);

    if (matchesPW) {
      // password hash matches actual password
      const { id, username, email } = userRow[0];

      // sign JWT
      const payload = { id, username };
      const token = `bearer ${jwt.sign(payload, process.env.JWT_SECRET)}`;

      // Set HTTP-only cookie
      res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days

      return res.status(200).json({ id, username, email });
    }

    errors.password = "Password is incorrect";

    res.status(422).json(errors);
  } catch (err) {
    // no user found relates to a username error
    errors.username = err.message;

    res.status(422).json(errors);
  }
});

/*

DELETE /users/logout

Handles logging out a user from the system
Essentially just clears the httpOnly cookie that stores the jwt

*/

usersRouter.delete("/logout", async (req, res) => {
  res.clearCookie("token");
  return res.status(200).end();
});

module.exports = usersRouter;
