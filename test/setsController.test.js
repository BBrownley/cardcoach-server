require("dotenv").config();

/*

  Consider the following valid payload:

  const payload = {
      title: "myTitle",
      description: "desc",
      cards: [{ id: 1, term: "1", definition: "1" }]
    };

  ...along with a valid JWT

  Test cases:

  - Missing httpOnly cookie (token)
  - Invalid httpOnly cookie (token)
  - Missing title
  - Missing description (should still be successfully submitted)
  - Cards array is empty
  - Cards array contains a card that has an empty field
  - Malformed payload

  */

const supertest = require("supertest");
const chai = require("chai");
const { app } = require("../index");

describe("POST /sets controller route", () => {
  it("should successfully process valid form data, given a valid JWT", async () => {
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

  it("Missing httpOnly cookie (token) returns a 422 error", async () => {
    const payload = {
      title: "myTitle",
      description: "desc",
      cards: [{ id: 1, term: "1", definition: "1" }]
    };

    const response = await supertest(app)
      .post("/sets")
      .send(payload);
    chai.expect(response.status).to.equal(422);
  });

  it("Invalid httpOnly cookie (token) returns a 422 error", async () => {
    const payload = {
      title: "myTitle",
      description: "desc",
      cards: [{ id: 1, term: "1", definition: "1" }]
    };

    const response = await supertest(app)
      .post("/sets")
      .set("Cookie", `token=Bearer blahblahblahimahacker`)
      .send(payload);
    chai.expect(response.status).to.equal(422);
  });

  it("Missing title returns a 422 error", async () => {
    const payload = {
      title: "",
      description: "desc",
      cards: [{ id: 1, term: "1", definition: "1" }]
    };

    const response = await supertest(app)
      .post("/sets")
      .set("Cookie", `token=Bearer ${process.env.VALID_BEARER_TOKEN}`)
      .send(payload);
    chai.expect(response.status).to.equal(422);
  });

  it("Missing description should still be successfully submitted with status 200", async () => {
    const payload = {
      title: "title",
      description: "",
      cards: [{ id: 1, term: "1", definition: "1" }]
    };

    const response = await supertest(app)
      .post("/sets")
      .set("Cookie", `token=Bearer ${process.env.VALID_BEARER_TOKEN}`)
      .send(payload);
    chai.expect(response.status).to.equal(200);
  });

  it("Empty cards array returns 422 error", async () => {
    const payload = {
      title: "title",
      description: "description",
      cards: []
    };

    const response = await supertest(app)
      .post("/sets")
      .set("Cookie", `token=Bearer ${process.env.VALID_BEARER_TOKEN}`)
      .send(payload);
    chai.expect(response.status).to.equal(422);
  });

  it("Card with missing field returns 422 error", async () => {
    const payload = {
      title: "title",
      description: "description",
      cards: [
        { id: 1, term: "1", definition: "1" },
        { id: 2, term: "2", definition: "" },
        { id: 3, term: "2", definition: "3" }
      ]
    };

    const response = await supertest(app)
      .post("/sets")
      .set("Cookie", `token=Bearer ${process.env.VALID_BEARER_TOKEN}`)
      .send(payload);
    chai.expect(response.status).to.equal(422);
  });

  it("Malformed payload returns 422 error", async () => {
    const payload = {
      title: "title",
      cards: { id: 1, term: "1", definition: "1" }
    };

    const response = await supertest(app)
      .post("/sets")
      .set("Cookie", `token=Bearer ${process.env.VALID_BEARER_TOKEN}`)
      .send(payload);
    chai.expect(response.status).to.equal(422);
  });
});

describe("GET /sets controller route", () => {
  it("when no sets belong to user, expect an empty array in response", async () => {
    // test DB contains user with no sets belonging to it with JWT OKEN_NO_SETS_ACC

    const response = await supertest(app)
      .get("/sets")
      .set("Cookie", `token=Bearer ${process.env.TOKEN_NO_SETS_ACC}`);

    chai.expect(response.status).to.equal(200);
    chai.expect(response._body.userSets).to.have.lengthOf(0);
  });

  it("when one sets belong to user, expect an array of length 1 in response", async () => {
    // test DB contains user with no sets belonging to it with JWT OKEN_NO_SETS_ACC

    const response = await supertest(app)
      .get("/sets")
      .set("Cookie", `token=Bearer ${process.env.TOKEN_ONE_SET_ACC}`);

    chai.expect(response.status).to.equal(200);
    chai.expect(response._body.userSets).to.have.lengthOf(1);
  });

  it("when more than one set belongs to user, expect an array of x length in response", async () => {
    // test DB contains user with no sets belonging to it with JWT OKEN_NO_SETS_ACC

    const response = await supertest(app)
      .get("/sets")
      .set("Cookie", `token=Bearer ${process.env.TOKEN_THREE_SETS_ACC}`);

    chai.expect(response.status).to.equal(200);
    chai.expect(response._body.userSets).to.have.lengthOf(3);
  });

  it("when invalid JWT is passed in header, return unauthorized server error", async () => {
    const response = await supertest(app)
      .get("/sets")
      .set("Cookie", `token=Bearer blahblahblah`);

    chai.expect(response.status).to.equal(401);
  });
});
