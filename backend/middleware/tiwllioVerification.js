require("dotenv").config();

//tiwilio secret id
const SERVICE_ID = process.env.SERVICE_ID;
const ACCOUNT_SID = process.env.ACCOUNT_SID;
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const MESSAGE_SSID = process.env.MESSAGE_SSID;
const client = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);

module.exports = {
  //send otp function

  sendOtp: (phone) => {
    return new Promise((resolve, reject) => {
      client.verify
        .services(SERVICE_ID)
        .verifications.create({ to: `+91${phone}`, channel: "sms" })
        .then((data) => {
          resolve(data);
        }).catch((err) => {
         
    });
  })
  },

  //Otp verification function

  CheckOtp: (phone, Otp) => {
    return new Promise((resolve, reject) => {
      client.verify
        .services(SERVICE_ID)
        .verificationChecks.create({
          to: `+91${phone}`,
          code: Otp,
        })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
        
        });
    });
  },

  //welcome message to client
  SendMessage: (number,message) => {
    return new Promise((resolve, reject) => {
      client.messages
        .create({
          body: message,
          messagingServiceSid: MESSAGE_SSID,
          to: `+91${number}`,
        })
        .then((message) => {
          resolve(message);
        })
        .catch((err) => {  
       
        });
    });
  },
};
