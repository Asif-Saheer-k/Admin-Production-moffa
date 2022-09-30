//datbase connection in using Mongoclient without using any schema

const mongoClient = require("mongodb").MongoClient;

const state = {
  db: null,
};
module.exports.connect = function (done) {
    //mongo url
  const url = `${process.env.MONGO_URL}`;

  mongoClient.connect(url, (err, data) => {
    if (err) return done(err);

    //mongoDB name
    const dbname = process.env.DATABASE;
    state.db = data.db(dbname);
  });
  done();
};
module.exports.get = function () {
  return state.db;
};
