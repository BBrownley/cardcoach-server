/*

Contains functions that interact with the database (published_sets, published_cards table)

*/

const dbConnection = require("../dbconnection").connection;

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
    dbConnection.getConnection((err, connection) => {
      // Start the transaction
      connection.beginTransaction(err => {
        if (err) throw err;

        connection.query(
          addSetQuery,
          [null, title, desc, decodedUser.id, false, 0],
          (err, results1) => {
            if (err) {
              // Rollback the transaction in case of an error
              return connection.rollback(() => {
                throw err;
              });
            }

            // set insert successful, get insert id to link with cards in published_cards table
            const setInsertId = results1.insertId;

            // transform card data into form corresponding to table columns
            const cardInsertData = cards.map(card => {
              return [null, setInsertId, card.term, card.definition, 0, 0, null];
            });

            connection.query(addCardsQuery, [cardInsertData], (err, results2) => {
              if (err) {
                // Rollback the transaction in case of an error
                return connection.rollback(() => {
                  throw err;
                });
              }

              // Commit the transaction if all queries are successful
              connection.commit(err => {
                if (err) {
                  // Rollback the transaction in case of an error during commit
                  return connection.rollback(() => {
                    throw err;
                  });
                }

                // Release the connection back to the pool
                connection.release();
                console.log("Transaction completed successfully.");
              });
            });
          }
        );
      });
    });
  } catch (err) {
    console.error(`Error occurred while creating set: ${err.message}`, err);
    throw new Error("Error occurred while creating set");
  }
};

const getUserSets = async userId => {
  const query = `
    SELECT * FROM published_sets
    WHERE author_id = ?
  `;

  const result = await dbConnection.promise().query(query, [userId]);

  // shape data for frontend to consume properly
  const sets = result[0].map(set => {
    return {
      title: set.name,
      setId: set.id,
      description: set.description,
      totalTerms: 0, // TODO: write another  query to get # of terms in set
      mastered: 0
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
    SELECT term, definition, author_id, 
    published_sets.name AS set_title, 
    published_sets.description AS set_description 
    FROM published_sets
    JOIN published_cards ON published_cards.set_id = published_sets.id
    WHERE set_id = ?
  `

    const result = await dbConnection.promise().query(query, [setId]);
    const data = result[0];

    // transform data, move title/desc properties from card data and put terms/defs into its own obj property

    // Edge case: set does not exist or is empty
    if (data.length === 0) {
      const error = new Error();
      error.message = `404 - Not found|The flash card set you requested does not exist - please go back and try looking for it again`
      error.status = 404;
      throw error
    }

    // check set ownership, and compare to the id of the requester
    const setAuthorId = data[0].author_id
    
    if (setAuthorId !== userId) { // userId -> requester
      const error = new Error(`Requested set ${setId} doesn't belong to the requesting user`);
      error.status = 401;
      throw error
    }

    // grab set title and desc from first card
    const setTitle = data[0].set_title;
    const setDesc = data[0].set_description;

    // map through card data, leaving behind only the terms/defs
    const setCards = data.map(card => {
      return { term: card.term, definition: card.definition };
    });

    return { setTitle, setDesc, setCards };

  // return sets;
};

module.exports = { createSet, getUserSets, getUserSet };
