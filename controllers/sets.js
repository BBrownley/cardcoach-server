/*

Controller file for flash card sets

*/

require("dotenv").config();

// const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const setsRouter = require("express").Router();

const setsModel = require("../models/sets");

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

  // 1) Validate - valid user JWT

  let decodedUser;

  try {
    decodedUser = jwt.verify(userJWT, process.env.JWT_SECRET);
  } catch (e) {
    return res
      .status(422)
      .json({ error: "Unable to decode jsonwebtoken - token may be invalid or expired" });
  }

  // Set insertion

  // 2.1) Validate - title fields are not empty, flash card fields filled in

  const setTitle = payload.title;
  const setDesc = payload.description;
  const cards = payload.cards;

  if (setTitle.trim("").length === 0) {
    return res.status(422).json({ error: "Set must be given a title" });
  }

  try {
    cards.forEach(card => {
      const cardTerm = card.term;
      const cardDefinition = card.definition;

      if (cardTerm.trim().length === 0 || cardDefinition.trim().length === 0) {
        throw new Error("One or more cards are missing a term or a definition");
      }
    });
  } catch (err) {
    return res.status(422).json({ error: err.message });
  }

  // 2.2) Begin database transaction, insert sets and cards

  try {
    await setsModel.createSet(setTitle, setDesc, cards, decodedUser);
  } catch (err) {
    // Return server error if insertion unsuccessful, transaction rolled back
    return res.status(422).json({ error: err.message });
  }

  return res.status(200).end();
});

module.exports = setsRouter;
