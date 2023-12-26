/*

Controller file for flash card sets

*/

require("dotenv").config();
const userAuth = require("../middleware/userAuth");

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
setsRouter.post("/", [userAuth.userDecode], async (req, res, next) => {
  const payload = req.body;
  const decodedUser = req.decodedUser;

  // // Set insertion

  // 2.1) Validate - title fields are not empty, flash card fields filled in,
  // at least one flash card present

  const setTitle = payload.title;
  const setDesc = payload.description;
  const cards = payload.cards;

  if (setTitle.trim("").length === 0) {
    return res.status(422).json({ error: "Set must be given a title" });
  }

  if (cards.length === 0) {
    return res.status(422).json({ error: "Set must contain at least one card" });
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

  // // 2.2) Begin database transaction, insert sets and cards

  try {
    await setsModel.createSet(setTitle, setDesc, cards, decodedUser);
  } catch (err) {
    // Return server error if insertion unsuccessful, transaction rolled back
    return res.status(422).json({ error: err.message });
  }

  return res.status(200).end();
});

/*

GET /sets

Gets all flashcard sets belonging to the current user
Makes calls to the sets model to carry out database operations.

if successful, returns all sets belonging to the user
if unsuccessful, returns a server error

*/
setsRouter.get("/", [userAuth.userDecode], async (req, res, next) => {
  //TODO: create user auth middleware for beginning of requests

  const userInfo = req.decodedUser;

  try {
    const userSets = await setsModel.getUserSets(userInfo.id);
    return res.status(200).json({ userSets });
  } catch (err) {
    return res.status(400).json({ error: "Unable to fetch user flash card sets" });
  }
});

module.exports = setsRouter;
