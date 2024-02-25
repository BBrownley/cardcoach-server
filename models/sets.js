/*

Contains functions that interact with the database (published_sets, published_cards table)

*/

const dbConnection = require("../dbconnection").connection;
const util = require("util");

/*

Creates a new entry in the published_sets table with corresponding cards in the published_cards table.

*/

const createSet = async (title, desc, cards, decodedUser) => {
  const addSetQuery = `
    INSERT INTO published_sets (id, name, description, author_id, skip_mastered_terms, mastery_requirement, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

  const addCardsQuery = `
    INSERT INTO published_cards (id, set_id, term, definition, order_num, mastery_progress, created_at) 
    VALUES ?
  `;

  try {
    // using a transaction will allow us to roll back any changes made to published_sets if the
    // addCardsQuery fails somehow. to do this, we must acquire a connection from the pool

    connection = await dbConnection.promise().getConnection();

    await connection.query("START TRANSACTION");

    const setResult = await connection.query(addSetQuery, [
      null,
      title,
      desc,
      decodedUser.id,
      false,
      0,
    ]);

    const setInsertId = setResult[0].insertId;

    // transform card data into form corresponding to table columns
    const cardInsertData = cards.map((card) => {
      return [null, setInsertId, card.term, card.definition, 0, 0, null];
    });

    await connection.query(addCardsQuery, [cardInsertData]);

    await connection.commit();
    await connection.release();

    return setInsertId;
  } catch (err) {
    console.error(e);
    await connection.query("ROLLBACK");
    await connection.release();

    const error = new Error(
      `500 - Internal Server Error|An unexpected error occured while creating set`
    );
    error.status = 500;
    throw error;
  }
};

const getUserSets = async (userId) => {
  const query = `
    SELECT * FROM published_sets
    WHERE author_id = ?
  `;

  const result = await dbConnection.promise().query(query, [userId]);

  // shape data for frontend to consume properly
  const sets = result[0].map((set) => {
    return {
      title: set.name,
      setId: set.id,
      description: set.description,
      totalTerms: 0, // TODO: write another  query to get # of terms in set
      mastered: 0,
    };
  });

  return sets;
};

/*

Queries the published_cards table, and returns all cards with specified set_id
Joins with published_sets table to include set info in the return object:

{
  cards: [
    {term: string, definition: string}
  ],
  setTitle: string,
  description: string
}

two different errors can arise from calling this function:

401 unauthorized:
  - the user is attempting to access a set they don't own
  - after querying the set, if it contains data, check author_id field and compare it to userId param

404 not found:
  - the user is attempting to access a set that doesn't exist, or is empty
  - determined by an empty query result

*/
const getUserSet = async (setId, userId) => {
  const query = `
    SELECT 
      term, 
      definition, 
      author_id, 
      published_sets.name AS set_title, 
      published_sets.description AS set_description,
      published_cards.id AS card_id
    FROM 
      published_sets
    JOIN 
      published_cards ON published_cards.set_id = published_sets.id
    WHERE 
      set_id = ?
  `;

  const result = await dbConnection.promise().query(query, [setId]);
  const data = result[0];

  // transform data, move title/desc properties from card data and put terms/defs into its own obj property

  // Edge case: set does not exist or is empty
  if (data.length === 0) {
    const error = new Error();
    error.message = `404 - Not found|The flash card set you requested does not exist - please go back and try looking for it again`;
    error.status = 404;
    throw error;
  }

  // check set ownership, and compare to the id of the requester
  const setAuthorId = data[0].author_id;

  if (setAuthorId !== userId) {
    // userId -> requester
    const error = new Error(
      `401 - Unauthorized|Requested set ${setId} doesn't belong to the requesting user`
    );
    error.status = 401;
    throw error;
  }

  // grab set title and desc from first card
  const setTitle = data[0].set_title;
  const setDesc = data[0].set_description;

  // map through card data, leaving behind only the terms/defs
  const setCards = data.map((card) => {
    return { term: card.term, definition: card.definition, id: card.card_id };
  });

  return { setTitle, setDesc, setCards };

  // return sets;
};

/*

Updates a set by adding, overwriting, and/or deleting cards belonging to the set

errors from calling this function:

401 unauthorized:
  - the user is attempting to edit a set they don't own

404 not found:
  - the user is attempting to edit a set that doesn't exist

500 Internal Server Error
  - an unexpected error occured when updating database entries
  - rolls back any changes that happened before the error

*/

const updateSet = async (setId, userId, addedCards, alteredCards, removedCardIDs) => {
  // run a query to verify that user owns this set and that it exists
  const verifyUserQuery = `
    SELECT * FROM published_sets
    WHERE id = ? 
  `;

  let authorId;

  try {
    const result = await dbConnection.promise().query(verifyUserQuery, [setId]);
    authorId = result[0][0].author_id;
  } catch (e) {
    const error = new Error(`404 - Not Found|Requested set ${setId} doesn't exist`);
    error.status = 404;
    throw error;
  }

  if (authorId !== userId) {
    const error = new Error(`401 - Unauthorized|Requested set ${setId} doesn't belong to user`);
    error.status = 401;
    throw error;
  }

  // begin transactions
  let connection;

  try {
    connection = await dbConnection.promise().getConnection();

    await connection.query("START TRANSACTION");

    // add new cards to set (addedCards = [{term: String, definition: String}])

    // transform card data into form corresponding to table columns
    const cardInsertData = addedCards.map((card) => {
      return [null, setId, card.term, card.definition, 0, 0, null];
    });

    if (cardInsertData.length > 0) {
      await connection.query(
        `
        INSERT INTO published_cards (id, set_id, term, definition, order_num, mastery_progress, created_at) 
        VALUES ?
      `,
        [cardInsertData]
      );
    }

    // alter edited cards (alteredCards = [{term: String, definition: String, id: Integer}])

    // transform card data into form corresponding to table columns
    const cardAlterData = alteredCards.map((card) => {
      return [card.id, setId, card.term, card.definition, 0, 0, null];
    });

    if (cardAlterData.length > 0) {
      await connection.query(
        `
        INSERT INTO published_cards (id, set_id, term, definition, order_num, mastery_progress, created_at) 
        VALUES ?
        ON DUPLICATE KEY UPDATE term=VALUES(term), definition=VALUES(definition)
      `,
        [cardAlterData]
      );
    }

    // remove deleted cards (removedCardIDs = int[])

    if (removedCardIDs.length > 0) {
      await connection.query(
        `
        DELETE FROM published_cards
        WHERE id IN(?)
      `,
        [removedCardIDs]
      );
    }

    await connection.commit();
    await connection.release();
  } catch (e) {
    console.error(e);
    await connection.query("ROLLBACK");
    await connection.release();

    const error = new Error(
      `500 - Internal Server Error|An unexpected error occured when updating database`
    );
    error.status = 500;
    throw error;
  }

  // dbConnection.getConnection((err, connection) => {
  //   // use util.promisify to allow for async-await
  //   const rollback = util.promisify(connection.rollback);
  //   const commit = util.promisify(connection.commit);
  //   const query = util.promisify(connection.query);

  //   connection.beginTransaction(async (err) => {
  //     const error = new Error(
  //       `500 - Internal Server Error|An unexpected error occured while querying the database`
  //     );
  //     error.status = 500;

  //     if (err) {
  //       throw error;
  //     }

  //     try {
  //       await query("SELECT * FROM published_sets");
  //       await query("SELECT * FROM published_cards");

  //       await commit();
  //     } catch (err) {
  //       await rollback();
  //     }
  //   });
  // });

  /*

  valid:

  INSERT INTO published_sets(name, description, author_id, skip_mastered_terms, mastery_requirement)
  VALUES ("hello", "world", 1, 0, 0)

  invalid:

  INSERT INTO published_sets(name, description, author_id, skip_mastered_terms, mastery_requirement)
  VALUES ("hello", "world", 1124553, 0, 0)

  */

  // commit transactions
};

module.exports = { createSet, getUserSets, getUserSet, updateSet };
