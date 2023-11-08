require("dotenv").config();

const app = require("express")();

const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

app.use(cookieParser());
app.use(bodyParser.json());

// since application will use httpOnly cookies, cors requires custom options:
const corsConfig = {
  origin: "http://localhost:3000", // allows the access of server resources from this origin
  credentials: true                // allows user sessions to be maintained
};

app.use(cors(corsConfig));
app.options("*", cors(corsConfig));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const usersRouter = require("./controllers/users");

app.use("/users", usersRouter);

app.get("/", (req, res) => {
  res.json("hello from the server side!");
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log("server running on port " + PORT);
});
