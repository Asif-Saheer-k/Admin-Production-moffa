const axios = require("axios");

module.exports.sendDispatchSMS = (
  number,
  trackingCode,
  deliveryProvider,
  orderUnique
) => {
  const { SMS_AUTHENTIC_KEY, SENDER_ID, DISPATCH_SMS_TEMPLATE_ID } =
    process.env;

  return axios.get("http://sms.text91msg.com/http-tokenkeyapi.php", {
    params: {
      "authentic-key": SMS_AUTHENTIC_KEY,
      senderid: SENDER_ID,
      route: 3,
      number: number,
      message:
        "Great News! Your Order #" +
        orderUnique +
        " is on the way. Track your Shipment to see the delivery status " +
        deliveryProvider +
        " " +
        trackingCode +
        " Regards! Kloths Royal",
      templateid: DISPATCH_SMS_TEMPLATE_ID,
    },
  });
};

module.exports.sendOTP = (number, otp) => {
  const { SMS_AUTHENTIC_KEY, SENDER_ID, OTP_TEMPLATE_ID } = process.env;

  return axios.get(
    "http://sms.text91msg.com/http-tokenkeyapi.php?authentic-key=" +
      SMS_AUTHENTIC_KEY +
      "&senderid=" +
      SENDER_ID +
      "&route=3&number=" +
      number +
      "&message=Your OTP is " +
      otp +
      " for Registration. Do not share your OTP with anyone. This OTP will be valid only for next 5 Minutes.Regards Kloths Royal&templateid=" +
      OTP_TEMPLATE_ID
  );
};

module.exports.sendOrderPlacedSMS = (number, order_unique) => {
  const { SMS_AUTHENTIC_KEY, SENDER_ID, ORDER_PLACED_TEMPLATE_ID } =
    process.env;

  return axios.get("http://sms.text91msg.com/http-tokenkeyapi.php", {
    params: {
      "authentic-key": SMS_AUTHENTIC_KEY,
      senderid: SENDER_ID,
      route: 3,
      number: number,
      message:
        "Thanks for shopping with us! Your Order #" +
        order_unique +
        " is confirmed and will be shipped shortly. Check your status here: https://kutt.it/pvPH0f Regards Kloths Royal",
      templateid: ORDER_PLACED_TEMPLATE_ID,
    },
  });
};

module.exports.sendResetPasswordSMS = (number, link) => {
  const { SMS_AUTHENTIC_KEY, SENDER_ID, RESET_PASS_SMS_TEMPLATE_ID } =
    process.env;

  return axios.get(
    "http://sms.text91msg.com/http-tokenkeyapi.php?authentic-key=" +
      SMS_AUTHENTIC_KEY +
      "&senderid=" +
      SENDER_ID +
      "&route=3&number=" +
      number +
      "&message=Dear Customer, your password reset link is " +
      link +
      " Links are valid for 24 hrs. Regards! Kloths Royal&templateid=" +
      RESET_PASS_SMS_TEMPLATE_ID
  );
};

module.exports.sendLoginOTP = (number, otp) => {
  console.log(number, otp);
  const { SMS_AUTHENTIC_KEY, SENDER_ID, LOGIN_OTP_TEMPLATE_ID } = process.env;
  return axios.get("http://sms.text91msg.com/http-tokenkeyapi.php", {
    params: {
      "authentic-key": SMS_AUTHENTIC_KEY,
      senderid: SENDER_ID,
      route: 3,
      number: number,
      message:
        "Your OTP is " +
        otp +
        " for Login. Do not share your OTP with anyone. This OTP will be valid only for next 5 Minutes. Regards Kloths Royal	",
      templateid: LOGIN_OTP_TEMPLATE_ID,
    },
  });
};
