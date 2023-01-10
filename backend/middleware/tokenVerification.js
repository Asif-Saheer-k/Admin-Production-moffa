const Jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  let authHeader = req.headers["auth-token"];
  if (authHeader == undefined) {
    res.status(401).send({ erorr: "no token provided" });
  }
  let token = authHeader;
  Jwt.verify(token, process.env.JWT_SECRET, (err, res) => {
    if (err) {
      console.log("Unautherized");
      res.status(500).json("Authentication Failed");
    } else {
      next();
    }
  });
}
module.exports = { verifyToken };
