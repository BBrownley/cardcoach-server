const { app } = require("./index");

const PORT = 3001;

app.listen(PORT, () => {
  console.log("server running on port " + PORT);
});
