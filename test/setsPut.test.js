require("dotenv").config();
const jwt = require("jsonwebtoken");
const supertest = require("supertest");
const chai = require("chai");
const { app } = require("../index");
const _ = require("lodash");

describe("PUT /sets/:setid controller route", () => {
  const beforeCards = [
    { id: 1, term: "term1", definition: "def1" },
    { id: 2, term: "term2", definition: "def2" },
    { id: 3, term: "term3", definition: "def3" },
  ];

  const initialSetPayload = {
    title: "myTitle",
    description: "desc",
    cards: beforeCards,
  };

  const initialSetInsert = async () => {
    const response = await supertest(app)
      .post("/sets")
      .set("Cookie", `token=Bearer ${process.env.VALID_BEARER_TOKEN}`)
      .send(initialSetPayload);

    chai.expect(response.status).to.equal(200);

    setId = response._body.setInsertId;

    return setId;
  };

  it("Sending a PUT request with no changes between the before/after state keeps the set intact", async () => {
    const setId = await initialSetInsert();

    const updatedCards = [
      { id: 1, term: "term1", definition: "def1" },
      { id: 2, term: "term2", definition: "def2" },
      { id: 3, term: "term3", definition: "def3" },
    ];

    const response = await supertest(app)
      .put(`/sets/${setId}`)
      .set("Cookie", `token=Bearer ${process.env.VALID_BEARER_TOKEN}`)
      .send({ beforeCards, updatedCards });

    // verify that the result from sending the states of both the beforeCards and updatedCards
    // equals updatedCards

    for (let i = 0; i < updatedCards.length; i++) {
      // the updated card submitted from the client
      const clientCard = { term: updatedCards[0].term, definition: updatedCards[0].definition };

      // the updated card with changes reflected in the database after PUT request
      const serverCard = response._body[0];

      chai.expect(clientCard).to.deep.equal(serverCard);
    }
  });
});
