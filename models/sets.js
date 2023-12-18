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
      description: set.description,
      totalTerms: 0, // TODO: write another  query to get # of terms in set
      mastered: 0
    };
  });

  return sets;
};

module.exports = { createSet, getUserSets };
