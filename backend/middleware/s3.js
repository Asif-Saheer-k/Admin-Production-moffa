const multer = require("multer");
const AWS = require("aws-sdk");
const ACCESS_KEY = "AKIAWJHY3CZLEPRCYZ35";
const SECRET_ACCESS_KEY = "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";

const s3 = new AWS.S3({
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECRET_ACCESS_KEY,
});

module.exports.uploadS3 = (fileData) => {
  return new Promise((resovle, reject) => {
    const params = {
      Bucket: "moffa",
      Key: `${Date.now().toString()}.jpg`,
      Body: fileData,
    };
    s3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log(data);
        return resovle(data);
      }
    });
  });
};
