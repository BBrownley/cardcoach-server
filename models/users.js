/*

Contains functions that interact with the database

*/

const dbConnection = require("../dbconnection").connection;

/*

Registers a user into the database.

*/

const addUser = async (username, hashedPW, email) => {
  const addUserQuery = `
    INSERT INTO users (id, username, hashed_password, email, created_at)
    VALUES (?, ?, ?, ?, NOW())
  `;

  try {
    const results = await dbConnection
      .promise()
      .query(addUserQuery, [null, username, hashedPW, email]);

    const insertId = results[0].insertId;

    // user successfully entered into db
    return { success: true, statusCode: 200, insertId };
  } catch (err) {
    // error thrown by database

    const errCode = err.code;
    const errMsg = err.message;

    if (errCode === "ER_DUP_ENTRY") {
      if (errMsg.includes("'username'")) {
        const error = new Error("Username already taken");
        error.statusCode = 409;
        throw error;
      } else if (errMsg.includes("'unique_email'")) {
        const error = new Error("Email already taken");
        error.statusCode = 409;
        throw error;
      }
    }

    const error = new Error("Unable to register user");
    error.statusCode = 500;
    throw error;
  }
};

// Finds a user in the database by username
const findUserByUsername = async username => {
  const findUserQuery = `
    SELECT * FROM users
    WHERE username = ?
    LIMIT 1
  `;

  const result = await dbConnection.promise().query(findUserQuery, [username]);

  // If result set is empty, user by the username couldn't be found
  if (result[0].length == 0) {
    throw new Error("Unknown username");
  }

  return result[0]
};

module.exports = { addUser, findUserByUsername };
