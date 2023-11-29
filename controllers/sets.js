/*

Contains functions that interact with the database

*/

const dbConnection = require("../dbconnection").connection;

/*

Controller file for flash card sets

*/

require("dotenv").config();

// const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const setsRouter = require("express").Router();

//const usersModel = require("../models/users");

/*

POST /sets

Adds a new set with corresponding cards to the database
Makes calls to the sets and cards models to carry out database operations.

if successful, returns a server OK status
if unsuccessful, rolls back any database operations made during this transaction and returns a server error

*/
setsRouter.post("/", async (req, res, next) => {
  const payload = req.body;
  const userJWT = req.cookies.token.split(" ")[1];

  console.log(payload);

  // 1) Validate - valid user JWT

  let decoded;

  try {
    decoded = jwt.verify(userJWT, process.env.JWT_SECRET);
  } catch (e) {
    res
      .status(422)
      .json({ error: "Unable to decode jsonwebtoken - token may be invalid or expired" });
  }

  console.log(decoded);

  // Set insertion

  // 2.1) Validate - title/desc fields are not empty

  // 2.2) Begin database transaction, insert sets

  // 2.3) Insert cards

  // Transaction status

  // 3.1) Return server OK status if insertions successful, commit transaction

  // 3.2) Return server error if insertion unsuccessful, rollback transaction
});

module.exports = setsRouter;
