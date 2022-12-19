const nodemailer = require("nodemailer");
const useremail = "thepaaki.aws@gmail.com";
const password = "plecopzoesakshck";

module.exports.sendMailOTP = (mail, otp) => {
  var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: useremail,
      pass: password,
    },
  });

  var mailOptions = {
    from: "thepaaki.aws@gmail.com",
    to: mail,
    subject: "Thepaaki Login OTP",
    text:
      "Your OTP is " +
      otp +
      " for Login. Do not share your OTP with anyone. Regards Thepaaki",
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

module.exports.sendOrderPlacedMail = (email) => {
  var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: useremail,
      pass: password,
    },
  });

  var placedMail = {
    from: "thepaaki.aws@gmail.com",
    to: email,
    subject: "Thepaaki Online",
    text: "Thanks for shopping with us! Your order is confirmed and will be shipped shortly. Check your status here: https://thepaaki.com/ Regards Thepaaki Royal",
  };

  transporter.sendMail(placedMail, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

module.exports.sendDispatchMail = (
  email,
  trackingCode,
  deliveryProvider,
  link,
  order_id
) => {
  var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: useremail,
      pass: password,
    },
  });

  var dispatchmail = {
    from: "thepaaki.aws@gmail.com",
    to: email,
    subject: "Thepaaki Online ",
    text:
      "Great News! Your Order " +order_id+" is on the way. Track your Shipment to see the delivery status " +
      deliveryProvider +
      " " +
      "Your tracking no is " +
      trackingCode +
      "  " +
      "Link " +
      link +
      "Regards! Thepaaki Royal",
  };

  transporter.sendMail(dispatchmail, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};
