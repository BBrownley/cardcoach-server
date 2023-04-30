require("dotenv").config();


const app = require("express")();
const cors = require("cors");
const bodyParser = require("body-parser");

const usersRouter = require("./controllers/users");

app.use(cors());
app.use(bodyParser.json());

app.use("/users", usersRouter);

app.get("/", (req, res) => {
  res.json("hello from the server side!");
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log("server running on port " + PORT);
});
