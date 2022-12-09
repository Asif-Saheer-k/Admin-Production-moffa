//user routes only
const express = require("express");
const {
  viewAllProducts,
  ViewBottomBanner,
} = require("../controllers/superAdminControllers");
const router = express.Router();
const {
  registerUser,
  Phoneverification,
  loginUser,
  VerifyPhone,
  cheackOtp,
  // getCartProduct,
  // removeProductCart,
  // getCartCount,
  PaytmIntegration,
  Callbackfunction,
  getTodayDeals,
  removeYesterDayDeal,
  removePreviousDeals,
  edituserProfile,
  TakeUserDeatails,
  changePassword,
  ResetOtpSend,
  DeleteuserAddress,
  getMyOrders,
  getMyorderProduts,
  AddWalletAmount,
  verifyWalletAmount,
  getCartProduct,
  addToCart,
  removeProductCart,
  razorpayIntegration,
  rezorpayOrder,
  createOrderObjct,
  deleteuserCart,
  AddAmountToWalletRazorpay,
  AddAmountToWallet,
  verificationPayment,
  CheckUserId
} = require("../controllers/userControllers");
const { verifyToken } = require("../middleware/tokenVerification");
//login routes using email,pssword
router.route("/login").post(loginUser);
// user registration routes using email,password,name,phonenumber
router.route("/register").post(registerUser);
//add to cart
router.route('/add-to-cart').post(addToCart)
//resent otp function
router.route("/resent-otp").get(ResetOtpSend);
//after registration otp verification routes;
router.route("/register/:otp").post(Phoneverification);
//user otp login routes using phone number;
router.route("/otpLogin").post(VerifyPhone);
// verifying otp routes;
router.route("/otpLogin/:otp").post(cheackOtp);
//view all products
router.route("/view-all-products").get(viewAllProducts);
//user Profile deatails routes
router.route("/user-deatails-get").post(TakeUserDeatails);
//pytm integration routes
router.route("/payment-methode/paytm").post(verifyToken, PaytmIntegration);
//view today deals
router.route("/today-deal-of-the-day").get(getTodayDeals);
//automatic delete yesterday deal
router.route("/remove-deal-of-the-day").delete(removeYesterDayDeal);
//callback function for payment
router.route("/callback").post(Callbackfunction);
//remove previous deal of the day offers
router.route("/cheack-today-date-remove-deal").delete(removePreviousDeals);
//user profile edit routed
router.route("/edit-user-deatails").post(verifyToken, edituserProfile);
//change password routes
router.route("/edit-user-password").put(verifyToken, changePassword);
//view bottom banner function
router.route("/view-all-bottom-banner").get(ViewBottomBanner);
//delete user addres
router.route("/delete-user-addres").post(verifyToken, DeleteuserAddress);
//get my order routes function
router.route("/get-my-orders/:id").get(getMyOrders);
//my orders products viewing
router.route("/view-my-orders-products").get(getMyorderProduts);
//add amount to wallet
router.route("/add-amount-wallet").post(AddWalletAmount);
//add wallet amount
router.route("/transaction").post(verifyWalletAmount);
//get cart produts
router.route('/view-cart-produts/:id').get(getCartProduct)
//remove cart produts
router.route('/dlete-cart-produts').post(removeProductCart)
//all products delete form cart after order succes
router.route('/dlete-cart').post(deleteuserCart)
//razorpay integration
router.route('/razorpay').post(razorpayIntegration)
//success in case of order success
router.route('/razorpay-payment/success').post(rezorpayOrder)
//create order object
router.route('/create-order-object').post(createOrderObjct)
//add amount to wallet through razorpay
router.route('/add-amount-razorpay').post(verifyToken,AddAmountToWalletRazorpay)
//add amount to wallet 
router.route('/add-amount-to-wallet').post(AddAmountToWallet)
//payment verification routes
router.route('/verify-razorpay-payment').post(verificationPayment)
router.route("/check-user-id").post(CheckUserId)


module.exports = router;
   