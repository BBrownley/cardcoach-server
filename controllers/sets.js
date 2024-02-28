/*

Controller file for flash card sets

*/

require("dotenv").config();
const userAuth = require("../middleware/userAuth");

// const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const setsRouter = require("express").Router();

const setsModel = require("../models/sets");

const _ = require("lodash");

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
    cards.forEach((card) => {
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
    const setInsertId = await setsModel.createSet(setTitle, setDesc, cards, decodedUser);
    return res.status(200).json({ setInsertId });
  } catch (err) {
    // Return server error if insertion unsuccessful, transaction rolled back
    return res.status(422).json({ error: err.message });
  }
});

/*

GET /sets/:id

Returns an array of cards to the client that's associated with set id

if successful, returns an array of cards
if unsuccessful, returns a server error

*/

setsRouter.get("/:id", [userAuth.userDecode], async (req, res, next) => {
  const userInfo = req.decodedUser;
  const requestedSetId = req.params["id"];

  try {
    const set = await setsModel.getUserSet(requestedSetId, userInfo.id);
    console.log(set);
    return res.status(200).json(set);
  } catch (err) {
    return res.status(err.status).json({ error: err.message });
  }
});

/*

GET /sets

Gets all flashcard sets belonging to the current user
Makes calls to the sets model to carry out database operations.

if successful, returns all sets belonging to the user
if unsuccessful, returns a server error

*/
setsRouter.get("/", [userAuth.userDecode], async (req, res, next) => {
  const userInfo = req.decodedUser;

  try {
    const userSets = await setsModel.getUserSets(userInfo.id);
    return res.status(200).json({ userSets });
  } catch (err) {
    return res.status(400).json({ error: "Unable to fetch user flash card sets" });
  }
});

/*

PUT /sets/:id

Updates a set with new info

*/

/*

initial state	edited state

{id: 1, term: "a"}	{id: 1, term: "a"}
{id: 2, term: "b"}	{id: 2, term: "c"} (term updated)
{id: 3, term: "c"}	{id: 4, term: "d"} (card added)

		note: card with id: 3 was deleted

we want to compare the before and after states to know which cards in the database should be:

- altered	  [{id: Integer, term: String, definition: String}]
- added     [{term: String, definition: String}]
- removed   int[]

----


How to determine which of the 3 categories each card falls into?

Altered and removed: 

Iterate through initialState. 

e.g. n = 1

cardFromInitial = initial[n]  // {id: 2, term: "b"}
cardFromEdited = edited.find(card => card.id === initial[n].id)  // {id: 2, term: "c"}

if (cardFromEdited === null):
  removed.push(cardFromInitial[n].id)

if _.isEqual(cardFromInitial, cardFromEdited) === false:
  altered.push(cardFromEdited)

...otherwise there were no changes


Added:

Iterate through edited state, look for entries (objects) with "new: true"

*/

setsRouter.put("/:id", [userAuth.userDecode], async (req, res, next) => {
  const payload = req.body;
  const setId = req.params.id;
  const userId = req.decodedUser.id;

  const beforeCardState = payload.beforeCards;
  const updatedCardState = payload.updatedCards;

  const removedCardIDs = [];
  const alteredCards = [];

  let addedCards;

  beforeCardState.forEach((cardFromBefore) => {
    // look for card in updated state with matching ID
    const cardFromEdited = updatedCardState.find(
      (cardFromAfter) => cardFromBefore.id === cardFromAfter.id
    );

    if (cardFromEdited === undefined) {
      // card ID missing from updated state, so it was removed
      removedCardIDs.push(cardFromBefore.id);
    } else if (_.isEqual(cardFromBefore, cardFromEdited) === false) {
      // card with matching ID found, but changes were made
      alteredCards.push(cardFromEdited);
    }
  });

  addedCards = updatedCardState
    .filter((c) => c.new)
    .map((newCard) => {
      return { term: newCard.term, definition: newCard.definition };
    });

  // addedCards.forEach((c) => {
  //   console.log(c);
  // });

  alteredCards.forEach((c) => {
    console.log(c);
  });

  try {
    const updatedSetResult = await setsModel.updateSet(
      setId,
      userId,
      addedCards,
      alteredCards,
      removedCardIDs
    );
    return res.status(200).send(updatedSetResult); // Note: need to send something back in PUT req or else it'll hang
  } catch (err) {
    console.error(err);
    return res.status(err.status).json({ error: err.message });
  }

  // removedCardIDs.forEach((id) => {
  //   console.log(id);
  // });

  // console.log("---");

  // console.log("---");
});

module.exports = setsRouter;
