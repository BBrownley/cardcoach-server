const jwt = require("jsonwebtoken");

const userDecode = async (req, res, next) => {
  let userJWT;

  try {
    userJWT = req.cookies.token.split(" ")[1];
  } catch (e) {
    const error = new Error("Unauthorized - Missing JWT");
    error.status = 401;
    return next(error);
  }

  let decodedUser;

  try {
    decodedUser = await jwt.verify(userJWT, process.env.JWT_SECRET);
  } catch (e) {
    const error = new Error("Unauthorized - invalid or expired JWT");
    error.status = 401;
    return next(error);
  }

  req.decodedUser = decodedUser;

  // Continue to the next middleware or route handler
  next();
};

module.exports = { userDecode };