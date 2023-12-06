require("dotenv").config();

const supertest = require("supertest");
const chai = require("chai");
const { app } = require("../index");

describe("sets controller route", () => {
  it("should successfully process valid form data", async () => {
    const payload = {
      title: "myTitle",
      description: "desc",
      cards: [{ id: 1, term: "1", definition: "1" }]
    };

    // Note - .post() takes in the shorthand version of the route, instead of https:// ..etc
    // otherwise it throws a 403 error
    const response = await supertest(app)
      .post("/sets")
      .set("Cookie", `token=Bearer ${process.env.VALID_BEARER_TOKEN}`)
      .send(payload);
    chai.expect(response.status).to.equal(200);
  });
});
