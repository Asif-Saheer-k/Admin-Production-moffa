const asyncHandler = require("express-async-handler");
const db = require("../config/db");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/jwtToken");
const sms = require("../middleware/sms");
const email = require("../middleware/emailVerification");
const collection = require("../config/collection");
const Paytm = require("paytmchecksum");
const verification = require("../middleware/tiwllioVerification");
const PaytmChecksum = require("../utils/PaytmCecksum");
const fromidable = require("formidable");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const https = require("https");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.SECRET_KEY,
  key_secret: process.env.SECRET_ID,
});
//login deatails
//user register controller with otp verification
const registerUser = asyncHandler(async (req, res) => {
  req.session.userDeatails = req.body;
  const OTP = Math.random().toFixed(6).split(".")[1];

  req.session.userDeatails.otp = OTP;
  const phoneNumber = req.session.userDeatails.phone;
  // Phone number cheacking in database
  const checkPhone = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .findOne({ phone: phoneNumber });
  if (checkPhone) {
    res.status(401).json("Phone Number Already Exists");
  } else {
    const checkPhoneWholsesaler = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .findOne({ phone: phoneNumber });
    if (checkPhoneWholsesaler) {
      res.status(401).json("Phone Number Already Exists");
    } else {
      // OTP sented function
      const code = sms.sendOTP(phoneNumber, OTP);
      if (code) {
        res.status(200).json("OTP Sent Successfully");
      } else {
        res.status(401).json("Invalid Phone number");
      }
    }
  }
});

//reset otp function
const ResetOtpSend = asyncHandler(async (req, res) => {
  if (req.session.userDeatails) {
    const phoneNumber = req.session.userDeatails.phone;
    const OTP = req.session.userDeatails.otp;
    const code = sms.sendOTP(phoneNumber, OTP);
    // const code = await verification.sendOtp(req.session.userDeatails.phone);
    if (code) {
      res.status(200).json("OTP Sent Successfully");
    } else {
      res.status(401).json("Invalid Phone number");
    }
  } else {
    res.status(500).json("Somthing went wrong");
  }
});

// Otp verification function
const Phoneverification = asyncHandler(async (req, res) => {
  const phoneNumber = req.session.userDeatails.phone;
  const number = phoneNumber.toString();
  const uniqueID = number.slice(0, 9);
  let ID = parseInt(uniqueID);
  let UserId = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .findOne({ CUST_ID: ID });
  if (!UserId) {
    if (req.session.userDeatails) {
      const eneterOtp = req.params.otp;
      const userData = req.session.userDeatails;
      userData.CUST_ID = ID;
      const phoneNumber = req.session.userDeatails.phone;
      const OTP = req.session.userDeatails.otp;
      userData.password = await bcrypt.hash(userData.password, 10);
      // check valid true or false
      if (eneterOtp == OTP) {
        const User = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .insertOne(userData);
        if (User) {
          res.status(200).json("successfuly reagisted");
        } else {
          res.status(500).json("Somthing went wrong");
        }
      } else {
        res.status(401).json("Please Verify OTP");
      }
    } else {
      res.status(500).json("Somthing went wrong");
    }
  } else {
    res.status(500).json("Somthing went wrong");
  }
});

//login user
const loginUser = asyncHandler(async (req, res) => {
  const Phone = req.body.phone;
  const Password = req.body.password;
  //check email in database
  const userDeatails = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .findOne({ phone: Phone });
  if (userDeatails) {
    //compate entered password and database password
    bcrypt.compare(Password, userDeatails.password).then(async (status) => {
      if (status) {
        const userId = userDeatails.CUST_ID;
        let cartItems = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .aggregate([
            {
              $match: { userId: parseInt(userId) },
            },
            {
              $unwind: "$products",
            },
            {
              $project: {
                item: "$products.item",
                quantity: "$products.quantity",
                selectedcolor: "$products.color",
                selectedsize: "$products.size",
              },
            },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTION,
                localField: "item",
                foreignField: "id",
                as: "product",
              },
            },
            {
              $project: {
                item: 1,
                quantity: 1,
                selectedcolor: 1,
                selectedsize: 1,
                product: { $arrayElemAt: ["$product", 0] },
              },
            },
          ])
          .toArray();
        const name = userDeatails.name;
        const user = true;
        const email = userDeatails.email;
        const phone = userDeatails.phone;
        const CUST_ID = userDeatails.CUST_ID;
        const token = generateToken(userDeatails._id);
        res.status(200).json({
          name,
          user,
          email,
          phone,
          token,
          CUST_ID,
          cartItems,
        });
      } else {
        res.status(500).json("Invalid Password");
      }
    });
  } else {
    const Wholesaler = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .findOne({ phone: Phone });

    if (Wholesaler) {
      bcrypt.compare(Password, Wholesaler.password).then(async (status) => {
        if (status) {
          const userId = Wholesaler.CUST_ID;
          let cartItems = await db
            .get()
            .collection(collection.CART_COLLECTION)
            .aggregate([
              {
                $match: { userId: parseInt(userId) },
              },
              {
                $unwind: "$products",
              },
              {
                $project: {
                  item: "$products.item",
                  quantity: "$products.quantity",
                  selectedcolor: "$products.color",
                  selectedsize: "$products.size",
                },
              },
              {
                $lookup: {
                  from: collection.PRODUCT_COLLECTION,
                  localField: "item",
                  foreignField: "id",
                  as: "product",
                },
              },
              {
                $project: {
                  item: 1,
                  quantity: 1,
                  selectedcolor: 1,
                  selectedsize: 1,
                  product: { $arrayElemAt: ["$product", 0] },
                },
              },
            ])
            .toArray();

          const name = Wholesaler.name;
          const user = false;
          const email = Wholesaler.email;
          const phone = Wholesaler.phone;
          const CUST_ID = Wholesaler.CUST_ID;
          const token = generateToken(Wholesaler._id);
          res.status(200).json({
            name,
            user,
            email,
            phone,
            token,
            CUST_ID,
            cartItems,
          });
        } else {
          res.status(401).json("Invalid Password");
        }
      });
    } else {
      res.status(401).json("Invalid Phone Number");
    }
  }
});

//otp login verify phone number function
const VerifyPhone = asyncHandler(async (req, res) => {
  const phoneNumber = req.body.phone;
  const OTP = Math.random().toFixed(6).split(".")[1];
  console.log(OTP);
  const userDeatails = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .findOne({ phone: phoneNumber });

  if (userDeatails) {
    userDeatails["otp"] = OTP;
    // email otption hidded
    if (userDeatails.email) {
      email.sendMailOTP(userDeatails.email, OTP);
    }
    const code = sms.sendOTP(phoneNumber, OTP);

    if (code) {
      req.session.userverify = true;
      req.session.otpLogin = userDeatails;
      res.status(200).json("OTP Sent Successfuly");
    } else {
      res.status(500).json("Somthing Went Wrong");
    }
  } else {
    const wholesalerDeatails = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .findOne({ phone: phoneNumber });

    if (wholesalerDeatails) {
      wholesalerDeatails.otp = OTP;
      req.session.userverify = false;
      req.session.otpLogin = wholesalerDeatails;
      sms.sendOTP(phoneNumber, OTP);
      // const code = await verification.sendOtp(phoneNumber);
      res.status(200).json("OTP Sent Successfuly");
    } else {
      res.status(401).json("Invalid Phone Number");
    }
  }
});

//verify otp login
const cheackOtp = asyncHandler(async (req, res) => {
  const Otp = req.params.otp;
  const users = req.session.otpLogin;
  const userverify = req.session.userverify;
  //otp check function
  if (userverify == true) {
    const user = true;
    // const code = await verification.CheckOtp(users.phone, Otp);
    if (users.otp == Otp) {
      const userId = users.CUST_ID;
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { userId: parseInt(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
              selectedcolor: "$products.color",
              selectedsize: "$products.size",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              selectedcolor: 1,
              selectedsize: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      const name = users.name;
      const email = users.email;
      const phone = users.phone;
      const CUST_ID = users.CUST_ID;
      const token = generateToken(users._id);
      res.status(200).json({
        name,
        email,
        phone,
        token,
        user,
        CUST_ID,
        cartItems,
      });
    } else {
      res.status(401).json("Invalid Otp Please verify Otp");
    }
  } else {
    // const code = await verification.CheckOtp(users.phone, Otp);
    if (users.otp == Otp) {
      const userId = users.CUST_ID;
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { userId: parseInt(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
              selectedcolor: "$products.color",
              selectedsize: "$products.size",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              selectedcolor: 1,
              selectedsize: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      const user = false;
      const name = users.name;
      const email = users.email;
      const phone = users.phone;
      const CUST_ID = users.CUST_ID;
      const token = generateToken(users._id);
      res.status(200).json({
        name,
        email,
        phone,
        token,
        user,
        CUST_ID,
        cartItems,
      });
    } else {
      res.status(401).json("Invalid Otp Please verify Otp");
    }
  }
});

//payment integration function
const PaytmIntegration = asyncHandler(async (req, res) => {
  var fromAddress;
  let Amount = req.body.totamAmount;
  const ID = req.body.CUST_ID;
  const Name = req.body.Name;
  const Pincode = req.body.Postcode;
  const LastName = req.body.LastName;
  const StreetAddress = req.body?.StreetAddress;
  const Apartment = req.body?.Apartment;
  const TownCity = req.body.TownCity;
  const PhoneNumber = req.body.PhoneNumber;
  const Email = req.body.Email;
  const message = req.body?.message;
  const State = req.body.State;
  const user = req.body.user;
  const Service = req.body.Service;
  if (!user) {
    const FromName = req.body.FromName;
    const FromLastName = req.body.FromLastName;
    const FromPincode = req.body.FromPincode;
    const FromStreetAddress = req.body.FromStreetAddress;
    const FromTownCity = req.body.FromTownCity;
    const FromPhoneNumber = req.body.FromPhoneNumber;
    const FromEmail = req.body.FromEmail;
    const FromState = req.body.FromState;
    fromAddress = {
      FromName,
      FromLastName,
      FromPincode,
      FromStreetAddress,
      FromTownCity,
      FromPhoneNumber,
      FromEmail,
      FromState,
    };
  }
  const DeliveyCharge = req.body.DeliveyCharge;
  const DeliveryType = req.body.DeliveryType;
  const payment_type = req.body.payment_type;
  var Role = "user";
  if (!user) {
    Role = "wholesaler";
    var Applywallet = req.body?.Applywallet;
    if (Applywallet > 0 && Applywallet < Amount) {
      Amount = Amount - Applywallet;
      req.session.Applywallet = Applywallet;
    }
  }

  const address = {
    Name,
    LastName,
    StreetAddress,
    Apartment,
    State,
    TownCity,
    Pincode,
    PhoneNumber,
    Email,
    message,
  };

  //add address user collection
  const addAddress = await db
    .get()
    .collection(collection.USER_COLLECTION)

    .updateOne({ CUST_ID: ID }, { $set: { Address: address } });
  await db
    .get()
    .collection(collection.WHOLESALER_COLLECTION)
    .updateOne(
      { CUST_ID: ID },
      {
        $set: { Address: address },
      }
    );
  if (!user) {
    await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .updateOne(
        { CUST_ID: ID },
        {
          $set: { FromAddress: fromAddress },
        }
      );
  }

  //address storing
  req.session.Address = address;
  //order product storing in seesion
  const OrderProductDeatails = req.body.OderProducts;
  //create oder id functin
  let OrdersId = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .find()
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
  let OrderId;
  if (OrdersId[0]?.Id) {
    OrderId = OrdersId[0].Id + 1;
  } else {
    OrderId = 130001;
  }

  //oder producting deatails storing array
  const OderProducts = [];
  //oder product deatails
  OrderProductDeatails.map(async (Product) => {
    const obj = {
      ProductID: Product.id,
      quantity: Product.quantity,
      color: Product.selectedProductColor,
      size: Product.selectedProductSize,
    };
    OderProducts.push(obj);
  });
  //increasing sales count
  OderProducts.map(async (items) => {
    await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .updateOne({ id: items.ProductID }, { $inc: { saleCount: 1 } });
  });
  const date = new Date().toLocaleDateString();
  //create order object
  if (Applywallet > 0) {
    const OrderObject = {
      Id: OrderId,
      CUST_ID: ID,
      Total: Amount,
      Product: OderProducts,
      Address: address,
      FromAddress: fromAddress,
      Date: date,
      user: user,
      role: Role,
      DeliveyCharge: DeliveyCharge,
      DeliveryType: DeliveryType,
      Courier: Service,
      wallet: Applywallet,
      payment_type: payment_type,
      status: "Pending",
      Payment: "Pending",
    };
    req.session.orderProducts = OrderObject;
  } else {
    if (user) {
      const OrderObject = {
        Id: OrderId,
        CUST_ID: ID,
        Total: Amount,
        Product: OderProducts,
        Address: address,
        Date: date,
        user: user,
        role: Role,
        DeliveyCharge: DeliveyCharge,
        DeliveryType: DeliveryType,
        payment_type: payment_type,
        Courier: Service,
        status: "Pending",
        Payment: "Pending",
      };
      req.session.orderProducts = OrderObject;
    } else {
      const OrderObject = {
        Id: OrderId,
        CUST_ID: ID,
        Total: Amount,
        Product: OderProducts,
        Address: address,
        FromAddress: fromAddress,
        Date: date,
        user: user,
        role: Role,
        DeliveyCharge: DeliveyCharge,
        DeliveryType: DeliveryType,
        Courier: Service,
        payment_type: payment_type,
        status: "Pending",
        Payment: "Pending",
      };
      req.session.orderProducts = OrderObject;
    }
  }
  // storing order object in session
  // req.session.orderProducts = OrderObject;

  //find quantity function
  const uuid = uuidv4();

  OderProducts.map(async (products) => {
    const product = await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .findOne({ id: products.ProductID });
    product.variation.map((obj) => {
      if (obj.color == products.color) {
        obj.size.map((sizesObj) => {
          if (sizesObj.name == products.size) {
            if (sizesObj.stock != 0) {
              var paytmParams = {};
              paytmParams["MID"] = "gpXQdM54976624519176";
              paytmParams["ORDER_ID"] = uuid;
              paytmParams["TXN_AMOUNT"] = `${Amount}`;
              paytmParams["WEBSITE"] = process.env.WEBSITE;
              paytmParams["INDUSTRY_TYPE_ID"] = process.env.INDUSTRY_TYPE_ID;
              paytmParams["CHANNEL_ID"] = "WEB";
              paytmParams["CUST_ID"] = ID;
              paytmParams["MOBILE_NO"] = PhoneNumber;
              paytmParams["EMAIL"] = Email;
              paytmParams["CALLBACK_URL"] = process.env.CALLBACK_URL;

              //chack order products
              const order = req.session.orderProducts;

              if (!order) {
                res.status(500).json("refresh");
              } else {
                var paytmChecksum = PaytmChecksum.generateSignature(
                  paytmParams,
                  `U58gVtPsODy6FdEo`
                );
                paytmChecksum
                  .then(function (result) {
                    let Params = {
                      ...paytmParams,
                      CHECKSUMHASH: result,
                      orderProducts: order,
                    };

                    res.status(200).json(Params);
                  })
                  .catch(function (error) {});
              }
            } else {
              res.status(404).json("Products out of stock");
            }
          }
        });
      }
    });
  });
});

const Callbackfunction = asyncHandler((req, res) => {
  const from = new fromidable.IncomingForm();
  from.parse(req, (err, field, file) => {
    var paytmChecksum = "";
    const received_data = field;
    var paytmParams = {};
    for (var key in received_data) {
      if (key == "CHECKSUMHASH") {
        paytmChecksum = received_data[key];
      } else {
        paytmParams[key] = received_data[key];
      }
    }
    var isVerifySignature = PaytmChecksum.verifySignature(
      paytmParams,
      `U58gVtPsODy6FdEo`,
      paytmChecksum
    );
    if (isVerifySignature) {
      /* initialize an object */
      var paytmParams = {};

      /* body parameters */
      paytmParams.body = {
        /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
        mid: field.MID,

        /* Enter your order id which needs to be check status for */
        orderId: field.ORDERID,
      };

      /**
       * Generate checksum by parameters we have in body
       * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys
       */
      PaytmChecksum.generateSignature(
        JSON.stringify(paytmParams.body),
        `U58gVtPsODy6FdEo`
      ).then(function (checksum) {
        /* head parameters */
        paytmParams.head = {
          /* put generated checksum value here */
          signature: checksum,
        };

        /* prepare JSON string for request */
        var post_data = JSON.stringify(paytmParams);

        var options = {
          /* for Staging */
          // hostname: "securegw-stage.paytm.in",

          /* for Production */
          hostname: "securegw.paytm.in",

          port: 443,
          path: "/v3/order/status",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": post_data.length,
          },
        };

        // Set up the request
        var response = "";
        var post_req = https.request(options, function (post_res) {
          post_res.on("data", function (chunk) {
            response += chunk;
          });

          post_res.on("end", async function () {
            const result = JSON.parse(response);

            if (result.body.resultInfo.resultStatus == "TXN_SUCCESS") {
              const ID = req.session.orderProducts.CUST_ID;
              const User = req.session.orderProducts.user;
              let Applywallet = req.session?.Applywallet;
              if (!User && Applywallet > 0) {
                const Apply = await db
                  .get()
                  .collection(collection.WHOLESALER_COLLECTION)
                  .updateOne(
                    { CUST_ID: ID },
                    { $inc: { wallet: -parseInt(Applywallet) } }
                  );
              }
              req.session.orderProducts.status = "Pending";
              req.session.orderProducts.Payment = "Success";
              const order = req.session.orderProducts;
              order.status = "Pending";
              order.Payment = "Success";
              order.dateIso = new Date();

              order.Product.map(async (products) => {
                const product = await db
                  .get()
                  .collection(collection.PRODUCT_COLLECTION)
                  .findOne({ id: products.ProductID });
                product.variation.map(async (obj, indexes) => {
                  if (obj.color == products.color) {
                    obj.size.map(async (sizesObj, index) => {
                      if (sizesObj.name == products.size) {
                        const updateStock = sizesObj.stock - products.quantity;
                        if (updateStock == 0) {
                          const obj = {
                            ProductID: products.ProductID,
                            color: products.color,
                            size: products.size,
                            stock: updateStock,
                            variationindex: indexes,
                            sizeindex: index,
                          };
                          await db
                            .get()
                            .collection(collection.STOCK_UPDATION_COLLECTION)
                            .insertOne(obj);
                        }

                        if (updateStock >= 0) {
                          const update = await db
                            .get()
                            .collection(collection.PRODUCT_COLLECTION)
                            .updateOne(
                              {
                                id: products.ProductID,
                                "variation.color": products.color,
                                "variation.size.name": products.size,
                              },
                              {
                                $set: {
                                  [`variation.${indexes}.size.${index}.stock`]:
                                    updateStock,
                                },
                              }
                            );
                        }
                      }
                    });
                  }
                });
              });
              const success = await db
                .get()
                .collection(collection.ORDER_COLLECTION)
                .insertOne(order);
              if (success) {
                req.session.orderProducts = null;
                req.session.Applywallet = null;
                res.redirect("https://www.thepaaki.com/success");
              } else {
                res.redirect("https://www.thepaaki.com/error");
              }
            } else {
              res.redirect("https://www.thepaaki.com/error");
            }
          });
        });
        post_req.write(post_data);
        post_req.end();
      });
    } else {
      return res.redirect("https://www.thepaaki.com/error");
    }
  });
});
// add to cart
const addToCart = asyncHandler(async (req, res) => {
  const proId = req.body.ProId;
  const userId = req.body.userId;
  const color = req.body.color;
  const size = req.body.size;
  const proObj = {
    item: proId,
    quantity: 1,
    color,
    size,
  };

  let userCart = await db
    .get()
    .collection(collection.CART_COLLECTION)
    .findOne({ userId: parseInt(userId) });
  if (userCart) {
    let proExist = userCart.products.findIndex(
      (product) =>
        product.item == proId && product.color == color && product.size == size
    );
    if (proExist != -1) {
      const incquantity = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { userId: userId, "products.item": proId },
          {
            $inc: { "products.$.quantity": 1 },
          }
        );
      if (incquantity) {
        res.status(200).json("quantity updated");
      } else {
        res.status(500).json("Somthing went wrong...");
      }
    } else {
      const update = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { userId: parseInt(userId) },
          {
            $push: { products: proObj },
          }
        );
      if (update) {
        res.status(200).json("Product Added");
      } else {
        res.status(500).json("Something went wrong....");
      }
    }
  } else {
    let cartObj = {
      userId: userId,
      products: [proObj],
    };
    const insert = await db
      .get()
      .collection(collection.CART_COLLECTION)
      .insertOne(cartObj);
    if (insert) {
      res.status(200).json("Cart updated");
    } else {
      res.status(500).json("Something went wrong....");
    }
  }
});

// get user cart product
const getCartProduct = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  let cartItems = await db
    .get()
    .collection(collection.CART_COLLECTION)
    .aggregate([
      {
        $match: { userId: parseInt(userId) },
      },
      {
        $unwind: "$products",
      },
      {
        $project: {
          item: "$products.item",
          quantity: "$products.quantity",
          selectedcolor: "$products.color",
          selectedsize: "$products.size",
        },
      },
      {
        $lookup: {
          from: collection.PRODUCT_COLLECTION,
          localField: "item",
          foreignField: "id",
          as: "product",
        },
      },
      {
        $project: {
          item: 1,
          quantity: 1,
          selectedcolor: 1,
          selectedsize: 1,
          product: { $arrayElemAt: ["$product", 0] },
        },
      },
    ])
    .toArray();
  if (cartItems) {
    res.status(200).json(cartItems);
  } else {
    res.status(401).json("Cart Empty");
  }
});

//reomove product from cart function
const removeProductCart = asyncHandler(async (req, res) => {
  const UserID = req.body.userID;
  const ProductID = req.body.Product;
  const deletes = await db
    .get()
    .collection(collection.CART_COLLECTION)
    .updateOne(
      {
        userId: parseInt(UserID),
      },
      {
        $pull: { products: { item: ProductID } },
      }
    );

  if (deletes) {
    res.status(200).json("deleted");
  } else {
    res.status(500).json("Somthing went wrong....");
  }
});

//change products quantity
// const changeProductQuantity = asyncHandler((req, res) => {
//   const count = req.body.count;
//   const updateCount = req.body.updateCount;
//   const CartId = req.body.CartID;
//   const productId = req.body.prodId;
//   details.count = parseInt(details.count);
//   details.quantity = parseInt(details.quantity);
//   return new promise((resolve, reject) => {
//     if (updateCount == -1 && count == 1) {
//       db.get()
//         .collection(collection.CART_COLLECTION)
//         .updateOne(
//           { _id: objectId(CartId) },
//           {
//             $pull: { products: { item: objectId(productId) } },
//           }
//         )
//         .then((response) => {
//           res.status(200).json({ status: "Removed Product from Cart" });
//         });
//     } else {
//       db.get()
//         .collection(collection.CART_COLLECTION)
//         .updateOne(
//           {
//             _id: objectId(CartId),
//             "products.item": objectId(productId),
//           },
//           {
//             $inc: { "products.$.quantity": updateCount },
//           }
//         )
//         .then((data) => {
//           res.status(200).json({ status: "successfuly updataed cart count: " });
//         });
//     }
//   });
// });

//get Cart function
// const getCartCount = asyncHandler((req, res) => {
//   let count = 0;
//   return new promise(async (resolve, reject) => {
//     let cart = await db
//       .get()
//       .collection(collection.CART_COLLECTION)
//       .findOne({ user: objectId(userId) });
//     if (cart) {
//       count = cart.products.length;
//       res.status(200).json({ cartCount: count });
//     } else {
//       res.status(200).json({ cartCount: count });
//     }
//   });
// });

//get total amount of cart
// const getTotalAmount = asyncHandler((req, res) => {
//   const userId = req.params.id;
//   return new promise(async (resolve, reject) => {
//     let total = await db
//       .get()
//       .collection(collection.CART_COLLECTION)
//       .aggregate([
//         {
//           $match: { user: objectId(userId) },
//         },
//         {
//           $unwind: "$products",
//         },
//         {
//           $project: {
//             item: "$products.item",
//             quantity: "$products.quantity",
//           },
//         },
//         {
//           $lookup: {
//             from: collection.PRODUCT_COLLECTION,
//             localField: "item",
//             foreignField: "_id",
//             as: "product",
//           },
//         },
//         {
//           $project: {
//             item: 1,
//             quantity: 1,
//             product: { $arrayElemAt: ["$product", 0] },
//           },
//         },
//         {
//           $group: {
//             _id: null,
//             total: {
//               $sum: {
//                 $multiply: ["$quantity", { $toInt: "$product.offerPrice" }],
//               },
//             },
//           },
//         },
//       ])
//       .toArray();
//     console.log(total[0]?.total);
//     if (total) {
//       res.status(200).json(total);
//     } else {
//       res.status(500).json({ err: "Somthing Went Wrong" });
//     }
//   });
// });

//wishilist

//add to wishilist
// const addWishilist = asyncHandler((req, res) => {
//   const product = req.body.prductId;
//   const userId = req.body.userId;
//   let proObj = {
//     item: objectId(product),
//   };
//   return new promise(async (resolve, reject) => {
//     let wishilistItem = await db
//       .get()
//       .collection(collection.USER_WISHILIST_COLLECTION)
//       .findOne({ user: objectId(userId) });
//     if (wishilistItem) {
//       let proExist = wishilistItem.products.findIndex(
//         (products) => products.item == product
//       );
//       console.log(proExist);
//       if (proExist != -1) {
//         db.get()
//           .collection(collection.USER_WISHILIST_COLLECTION)
//           .updateOne(
//             { user: objectId(userId) },
//             {
//               $pull: { products: { item: objectId(product) } },
//             }
//           )
//           .then((data) => {
//             if (data) {
//               res.status(200).json({ status: "Product removed from wishlist" });
//             } else {
//               res.status(500).json({ error: "Somthing went wrong..." });
//             }
//           });
//       } else {
//         db.get()
//           .collection(collection.USER_WISHILIST_COLLECTION)
//           .updateOne(
//             { user: objectId(userId) },
//             {
//               $push: { products: proObj },
//             }
//           )
//           .then((response) => {
//             if (response) {
//               res.status(200).json({ status: "Produtct added" });
//             } else {
//               res.status(500).json({ erorr: "Something went wrong..." });
//             }
//           });
//       }
//     } else {
//       let wishlistObj = {
//         user: objectId(userId),
//         products: [proObj],
//       };
//       db.get()
//         .collection(collection.USER_WISHILIST_COLLECTION)
//         .insertOne(wishlistObj)
//         .then((response) => {
//           if (response) {
//             res.status(200).json({ status: "wishilist updated" });
//           } else {
//             res.status(500).json({ error: "Something went wrong.." });
//           }
//         });
//     }
//   });
// });

//getwishilist products
// const getwishilist = asyncHandler((req, res) => {
//   const userId = req.params.id;
//   console.log(userId);
//   return new promise(async (resolve, reject) => {
//     let items = await db
//       .get()
//       .collection(collection.USER_WISHILIST_COLLECTION)
//       .aggregate([
//         {
//           $match: { user: objectId(userId) },
//         },
//         {
//           $unwind: "$products",
//         },
//         {
//           $project: {
//             item: "$products.item",
//           },
//         },
//         {
//           $lookup: {
//             from: collection.PRODUCT_COLLECTION,
//             localField: "item",
//             foreignField: "_id",
//             as: "product",
//           },
//         },
//         {
//           $project: {
//             item: 1,
//             product: { $arrayElemAt: ["$product", 0] },
//           },
//         },
//       ])
//       .toArray();
//     if (items) {
//       res.status(200).json(items);
//     } else {
//       res.status(500).json({ error: "Somthing went wrong" });
//     }
//   });
// });

//remove products from wishilist
//pending works

//today deal function
const getTodayDeals = asyncHandler(async (req, res) => {
  const montharay = [
    "01",
    "02",
    "03",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];
  const today = new Date();
  const day = today.getDate(); // 24
  const month = today.getMonth() + 1; // 10 (Month is 0-based, so 10 means 11th Month)
  const year = today.getFullYear();
  const tod = day + "/" + montharay[month] + "/" + year;
  const TodayDeal = await db
    .get()
    .collection(collection.DEAL_OF_THE_DAY)
    .findOne({ date: tod });
  if (TodayDeal) {
    res.status(200).json(TodayDeal);
  } else {
    res.status(204).json("NO DEAL");
  }
});
const removeYesterDayDeal = asyncHandler(async (req, res) => {
  const montharay = [
    "01",
    "02",
    "03",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const PreviousDay = day + "/" + montharay[month] + "/" + year;
  const deletes = await db
    .get()
    .collection(collection.DEAL_OF_THE_DAY)
    .deleteOne({ date: PreviousDay });

  if (deletes) {
    await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .updateOne({ "Deal.date": PreviousDay }, { $unset: { Deal: " " } });

    res.status(200).json("Success");
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});
const removePreviousDeals = asyncHandler(async (req, res) => {
  const montharay = [
    "01",
    "02",
    "03",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const PreviousDay = day + "/" + montharay[month] + "/" + year;
  await db
    .get()
    .collection(collection.DEAL_OF_THE_DAY)
    .deleteMany({ date: { $lt: PreviousDay } });
  res.status(200).json("success");
});

//user profile editing function
const edituserProfile = asyncHandler(async (req, res) => {
  const Name = req.body.name;
  const Email = req.body.email;
  const Phone = req.body.phone;
  const orginPhoneNumber = req.body.originalPhone;
  const cheackUser = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .findOne({ phone: orginPhoneNumber });
  if (cheackUser) {
    const updateUserDeatails = await db
      .get()
      .collection(collection.USER_COLLECTION)
      .updateOne(
        { phone: orginPhoneNumber },
        { $set: { name: Name, email: Email, phone: Phone } }
      );
    if (updateUserDeatails) {
      res.status(200).json("Success");
    } else {
      res.status(500).json("Somthing Went Wrong");
    }
  } else {
    const updateUserDeatails = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .updateOne(
        { phone: orginPhoneNumber },
        { $set: { name: Name, email: Email, phone: Phone } }
      );
    if (updateUserDeatails) {
      res.status(200).json("Success");
    } else {
      res.status(500).json("Somthing Went Wrong");
    }
  }
});

//Take user Deatails function parms phone number passing
const TakeUserDeatails = asyncHandler(async (req, res) => {
  const Deatails = req.body;
  if (Deatails.users) {
    const userDeatails = await db
      .get()
      .collection(collection.USER_COLLECTION)
      .findOne({ CUST_ID: parseInt(Deatails.id) });
    if (userDeatails) {
      const obj = {
        name: userDeatails.name,
        email: userDeatails.email,
        phone: userDeatails.phone,
        user: true,
        Address: userDeatails.Address,
      };

      res.status(200).json(obj);
    } else {
      res.status(500).json("Somthing Went Wrong");
    }
  } else {
    const wholesalerDeatails = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .findOne({ CUST_ID: parseInt(Deatails.id) });
    if (wholesalerDeatails) {
      const obj = {
        name: wholesalerDeatails.name,
        email: wholesalerDeatails.email,
        phone: wholesalerDeatails.phone,
        wallet: wholesalerDeatails.wallet,
        user: false,
        Address: wholesalerDeatails.Address,
        FromAddress: wholesalerDeatails?.FromAddress,
      };
      res.status(200).json(obj);
    } else {
      res.status(500).json("Somthing Went Wrong");
    }
  }
});
const changePassword = asyncHandler(async (req, res) => {
  const Oldpassword = req.body.Oldpassword;
  const Password = req.body.NewPassword;
  const user = req.body.users;
  const phoneNumber = req.body.phones;
  if (user) {
    const userDeatails = await db
      .get()
      .collection(collection.USER_COLLECTION)
      .findOne({ phone: phoneNumber });
    if (userDeatails) {
      bcrypt
        .compare(Oldpassword, userDeatails.password)
        .then(async (status) => {
          if (status) {
            const NewPassword = await bcrypt.hash(Password, 10);
            await db
              .get()
              .collection(collection.USER_COLLECTION)
              .updateOne(
                { phone: phoneNumber },
                { $set: { password: NewPassword } }
              );
            res.status(200).json("success");
          } else {
            res.status(401).json("Invalid Password");
          }
        });
    } else {
      res.status(500).json("Somthing went Wrong");
    }
  } else {
    const wholesalerDeatails = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .findOne({ phone: phoneNumber });
    if (wholesalerDeatails) {
      bcrypt
        .compare(Oldpassword, wholesalerDeatails.password)
        .then(async (status) => {
          if (status) {
            const NewPassword = await bcrypt.hash(Password, 10);
            await db
              .get()
              .collection(collection.WHOLESALER_COLLECTION)
              .updateOne(
                { phone: phoneNumber },
                { $set: { password: NewPassword } }
              );
            res.status(200).json("success");
          } else {
            res.status(401).json("Invalid Password");
          }
        });
    } else {
      res.status(500).json("Somthing went Wrong");
    }
  }
});
//delete user address
const DeleteuserAddress = asyncHandler(async (req, res) => {
  const ID = req.body.userId;
  const User = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .updateOne({ CUST_ID: ID }, { $unset: { Address: "" } });
  const wholeSaler = await db
    .get()
    .collection(collection.WHOLESALER_COLLECTION)
    .updateOne({ CUST_ID: ID }, { $unset: { Address: "" } });

  if (User) {
    res.status(200).json("Success");
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});

const getMyOrders = asyncHandler(async (req, res) => {
  const UserID = req.params.id;
  const Myorders = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .find({ CUST_ID: parseInt(UserID) })
    .sort({ _id: -1 })
    .toArray();
  if (Myorders) {
    res.status(200).json(Myorders);
  } else {
    res.status(204).json("No records");
  }
});
//get my orders produts
const getMyorderProduts = asyncHandler(async (req, res) => {
  const myOrdersProducts = await db
    .get()
    .collection(collection.PRODUCT_COLLECTION)
    .find()
    .toArray();
  if (myOrdersProducts) {
    res.status(200).json(myOrdersProducts);
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});

//add wallet Amount
const AddWalletAmount = asyncHandler((req, res) => {
  const Amount = req.body.Amount;
  const ID = req.body.ID;
  const phone = req.body.phone;
  const email = req.body.email;
  const userId = uuidv4();
  req.session.wholeSalerID = ID;
  req.session.wholeSalerIDAmount = Amount;
  var paytmParams = {};
  paytmParams["MID"] = "gpXQdM54976624519176";
  paytmParams["ORDER_ID"] = userId;
  paytmParams["TXN_AMOUNT"] = Amount;
  paytmParams["WEBSITE"] = process.env.WEBSITE;
  paytmParams["INDUSTRY_TYPE_ID"] = process.env.INDUSTRY_TYPE_ID;
  paytmParams["CHANNEL_ID"] = process.env.CHANNEL_ID;
  paytmParams["CUST_ID"] = ID;
  paytmParams["MOBILE_NO"] = phone;
  paytmParams["EMAIL"] = email;
  paytmParams["CALLBACK_URL"] = process.env.WALLET_CALLBACK_URL;
  var paytmChecksum = PaytmChecksum.generateSignature(
    paytmParams,
    `U58gVtPsODy6FdEo`
  );

  paytmChecksum
    .then(function (result) {
      let Params = {
        ...paytmParams,
        CHECKSUMHASH: result,
      };
      res.status(200).json(Params);
    })
    .catch(function (error) {
      res.status(500).json("Somthing Went Wrong");
    });
});

//add wallet amount
const verifyWalletAmount = asyncHandler((req, res) => {
  const from = new fromidable.IncomingForm();
  from.parse(req, (err, field, file) => {
    var paytmChecksum = "";
    const received_data = field;
    var paytmParams = {};
    for (var key in received_data) {
      if (key == "CHECKSUMHASH") {
        paytmChecksum = received_data[key];
      } else {
        paytmParams[key] = received_data[key];
      }
    }
    var isVerifySignature = PaytmChecksum.verifySignature(
      paytmParams,
      `U58gVtPsODy6FdEo`,
      paytmChecksum
    );
    if (isVerifySignature) {
      /* initialize an object */
      var paytmParams = {};

      /* body parameters */
      paytmParams.body = {
        /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
        mid: field.MID,

        /* Enter your order id which needs to be check status for */
        orderId: field.ORDERID,
      };
      /**
       * Generate checksum by parameters we have in body
       * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys
       */
      PaytmChecksum.generateSignature(
        JSON.stringify(paytmParams.body),
        `U58gVtPsODy6FdEo`
      ).then(function (checksum) {
        /* head parameters */
        paytmParams.head = {
          /* put generated checksum value here */
          signature: checksum,
        };

        /* prepare JSON string for request */
        var post_data = JSON.stringify(paytmParams);

        var options = {
          /* for Staging */
          // hostname: "securegw-stage.paytm.in",

          /* for Production */
          hostname: "securegw.paytm.in",

          port: 443,
          path: "/v3/order/status",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": post_data.length,
          },
        };

        var amount = req.session.wholeSalerIDAmount;
        var ID = req.session.wholeSalerID;

        // Set up the request
        var response = "";
        var post_req = https.request(options, function (post_res) {
          post_res.on("data", function (chunk) {
            response += chunk;
          });
          post_res.on("end", async function () {
            const result = JSON.parse(response);

            if (result.body.resultInfo.resultStatus == "TXN_SUCCESS") {
              const updateAmount = await db
                .get()
                .collection(collection.WHOLESALER_COLLECTION)
                .updateOne(
                  { CUST_ID: ID },
                  { $inc: { wallet: parseInt(amount) } }
                );
              return res.redirect("/my-account");
            } else {
              return res.redirect("/error");
            }
          });
        });
        post_req.write(post_data);
        post_req.end();
      });
    } else {
      return res.redirect("/error");
    }
  });
});
const createOrderObjct = asyncHandler(async (req, res) => {
  var fromAddress;
  let Amount = req.body.totamAmount;
  const ID = req.body.CUST_ID;
  const Name = req.body.Name;
  const Pincode = req.body.Postcode;
  const LastName = req.body.LastName;
  const StreetAddress = req.body?.StreetAddress;
  const Apartment = req.body?.Apartment;
  const TownCity = req.body.TownCity;
  const PhoneNumber = req.body.PhoneNumber;
  const Email = req.body?.Email;
  const message = req.body?.message;
  const State = req.body.State;
  const user = req.body.user;
  const Service = req.body.Service;
  if (!user) {
    const FromName = req.body.FromName;
    const FromLastName = req.body.FromLastName;
    const FromPincode = req.body.FromPincode;
    const FromStreetAddress = req.body?.FromStreetAddress;
    const FromTownCity = req.body.FromTownCity;
    const FromPhoneNumber = req.body.FromPhoneNumber;
    const FromEmail = req.body?.FromEmail;
    const FromState = req.body.FromState;
    fromAddress = {
      FromName,
      FromLastName,
      FromPincode,
      FromStreetAddress,
      FromTownCity,
      FromPhoneNumber,
      FromEmail,
      FromState,
    };
  }
  const DeliveyCharge = req.body.DeliveyCharge;
  const payment_type = req.body.payment_type;
  var Role = "user";
  if (!user) {
    Role = "wholesaler";
    var Applywallet = req.body?.Applywallet;
    if (Applywallet > 0) {
      Amount = Amount - Applywallet;
      req.session.Applywallet = Applywallet;
    }
  }
  const address = {
    Name,
    LastName,
    StreetAddress,
    Apartment,
    State,
    TownCity,
    Pincode,
    PhoneNumber,
    Email,
    message,
  };
  //add address user collection
  const addAddress = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .updateOne({ CUST_ID: ID }, { $set: { Address: address } });
  if (!addAddress) {
    await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .updateOne(
        { CUST_ID: ID },
        {
          $set: { Address: address },
        }
      );
  }

  if (!user) {
    const update = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .updateOne(
        { CUST_ID: ID },
        {
          $set: { FromAddress: fromAddress },
        }
      );
    await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .updateOne(
        { CUST_ID: ID },
        {
          $set: { Address: address },
        }
      );
  }
  //address storing
  req.session.Address = address;
  //order product storing in seesion
  const OrderProductDeatails = req.body.OderProducts;
  //create oder id functin
  let OrdersId = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .find()
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
  let OrderId;
  let InvoceNO;

  if (OrdersId[0]?.Id) {
    OrderId = OrdersId[0].Id + 1;
    const PR = OrdersId[0].InvoceNO.slice(5);
    const inc = parseInt(PR) + 1;
    InvoceNO = "MFA00" + inc;
  } else {
    OrderId = 130001;
    InvoceNO = "MFA" + 001;
  }
  //oder producting deatails storing array
  const OderProducts = [];
  //oder product deatails
  OrderProductDeatails.map(async (Product) => {
    const Deal = Product.Deal;
    const date = req.body.Date;
    let discount = Product.discount;
    const TodayDeal = Deal.filter((item) => {
      if (item.date == date) {
        discount = item.offer;
      }
    });

    const obj = {
      ProductID: Product.id,
      quantity: Product.quantity,
      color: Product.selectedProductColor,
      size: Product.selectedProductSize,
      Price: Product.price,
      dicount: discount,
      wholeSalerPrice: Product.wholesaler,
    };

    OderProducts.push(obj);
  });

  //increasing sales count
  OderProducts.map(async (items) => {
    await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .updateOne({ id: items.ProductID }, { $inc: { saleCount: 1 } });
  });
  const date = req.body.Date;
  //create order object
  if (Applywallet > 0) {
    const OrderObject = {
      Id: OrderId,
      CUST_ID: ID,
      Total: Amount,
      Product: OderProducts,
      Address: address,
      FromAddress: fromAddress,
      Date: date,
      user: user,
      role: Role,
      DeliveyCharge: DeliveyCharge,
      Courier: Service,
      wallet: Applywallet,
      payment_type: payment_type,
      status: "Pending",
      Payment: "Pending",
      InvoceNO: InvoceNO,
    };
    req.session.orderProducts = OrderObject;
  } else {
    if (user) {
      const OrderObject = {
        Id: OrderId,
        CUST_ID: ID,
        Total: parseInt(Amount),
        Product: OderProducts,
        Address: address,
        Date: date,
        user: user,
        role: Role,
        DeliveyCharge: DeliveyCharge,
        Courier: Service,
        status: "Pending",
        Payment: "Pending",
        InvoceNO: InvoceNO,
      };
      req.session.orderProducts = OrderObject;
    } else {
      const OrderObject = {
        Id: OrderId,
        CUST_ID: ID,
        Total: parseInt(Amount),
        Product: OderProducts,
        Address: address,
        FromAddress: fromAddress,
        Date: date,
        user: user,
        role: Role,
        DeliveyCharge: DeliveyCharge,
        Courier: Service,
        status: "Pending",
        Payment: "Pending",
        InvoceNO: InvoceNO,
      };
      req.session.orderProducts = OrderObject;
    }
  }

  // storing order object in session
  // req.session.orderProducts = OrderObject;
  //find quantity function
  const orderItems = req.session.orderProducts;
  var stock = true;

  if (stock) {
    res.status(200).json(orderItems);
  } else {
    res.status(403).json("Product out stock");
  }
});

const razorpayIntegration = asyncHandler(async (req, res) => {
  const orderObject = req.session.orderProducts;
  const amount = orderObject.Total;
  const userId = orderObject.CUST_ID;
  try {
    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency: "INR",
      receipt: `receipt_order_${userId}`,
    };
    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).send("Some error occured");
    res.status(200).json(order);
  } catch (error) {
    res.status(500).send(error);
  }
});

//razorpay payment verification function
const verificationPayment = asyncHandler(async (req, res) => {
  const { razorpaySignature, razorpayOrderId, razorpayPaymentId } = req.body;
  let hmac = crypto.createHmac("sha256", process.env.SECRET_ID);
  hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
  hmac = hmac.digest("hex");
  const order = req.session.orderProducts;
  order["razorpayPaymentId"] = razorpayPaymentId;
  req.session.orderProducts = order;
  if (hmac == razorpaySignature) {
    res.status(200).json("Payment Success");
  } else {
    res.status(500).json("Payment Failed");
  }
});

const rezorpayOrder = asyncHandler(async (req, res) => {
  const ID = req.session.orderProducts.CUST_ID;
  const User = req.session.orderProducts.user;
  const order = req.session.orderProducts;
  let Applywallet = req.session?.Applywallet;
  if (!User && Applywallet > 0) {
    const Apply = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .updateOne({ CUST_ID: ID }, { $inc: { wallet: -parseInt(Applywallet) } });
  }
  req.session.orderProducts.status = "Pending";
  req.session.orderProducts.Payment = "Success";
  order.status = "Pending";
  order.Payment = "Success";
  order.dateIso = new Date();
  order.Product.map(async (products) => {
    const product = await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .findOne({ id: products.ProductID });
    product.variation.map(async (obj, indexes) => {
      if (obj.color == products.color) {
        obj.size.map(async (sizesObj, index) => {
          if (sizesObj.name == products.size) {
            const updateStock = sizesObj.stock - products.quantity;
            if (updateStock == 0) {
              const obj = {
                ProductID: products.ProductID,
                color: products.color,
                size: products.size,
                stock: updateStock,
                variationindex: indexes,
                sizeindex: index,
              };
              await db
                .get()
                .collection(collection.STOCK_UPDATION_COLLECTION)
                .insertOne(obj);
            }

            if (updateStock >= 0) {
              const update = await db
                .get()
                .collection(collection.PRODUCT_COLLECTION)
                .updateOne(
                  {
                    id: products.ProductID,
                    "variation.color": products.color,
                    "variation.size.name": products.size,
                  },
                  {
                    $set: {
                      [`variation.${indexes}.size.${index}.stock`]: updateStock,
                    },
                  }
                );
            }
          }
        });
      }
    });
  });

  let smsphone;
  let sendEmail;
  let name;
  if (order.user) {
    const Take = await db
      .get()
      .collection(collection.USER_COLLECTION)
      .findOne({ CUST_ID: parseInt(order.CUST_ID) });
    smsphone = Take.phone;
    sendEmail = Take?.email;
    name = Take.name;
  } else {
    const Take = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .findOne({ CUST_ID: parseInt(order.CUST_ID) });
    smsphone = Take.phone;
    sendEmail = Take?.email;
    name = Take.name;
  }
  let OrdersId = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .find()
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
  let OrderId;
  let InvoceNO;
  if (OrdersId[0]?.Id) {
    OrderId = OrdersId[0].Id + 1;
    const PR = OrdersId[0].InvoceNO.slice(5);
    const inc = parseInt(PR) + 1;
    InvoceNO = "MFA00" + inc;
  } else {
    OrderId = 130001;
    InvoceNO = "MFA" + 001;
  }
  order["Id"] = OrderId;
  order["InvoceNO"] = InvoceNO;
  order["smsphone"] = smsphone;
  order["userEmail"] = sendEmail;
  order["orderName"] = name;
  const success = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .insertOne(order);
  if (success) {
    if (smsphone) {
      sms.sendOrderPlacedSMS(OrderId, smsphone);
    }
    if (sendEmail) {
      email.sendOrderPlacedMail(sendEmail);
    }
    req.session.orderProducts = null;
    req.session.Applywallet = null;
    res.status(200).json("Success");
  } else {
    res.status(400).json("Somthing Went Wrong");
  }
});
const deleteuserCart = asyncHandler(async (req, res) => {
  const userid = req.body.userID;
  const deleteCart = await db
    .get()
    .collection(collection.CART_COLLECTION)
    .deleteOne({
      userId: userid,
    });
  if (deleteCart) {
    res.status(200).json("Success");
  } else {
    res.status(500).json("Somthing went wrong");
  }
});
//amount add to wallet through razorpay
const AddAmountToWalletRazorpay = asyncHandler(async (req, res) => {
  const amount = req.body.Amount;
  try {
    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency: "INR",
      receipt: "receipt_order_74394",
    };
    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).send("Some error occured");
    res.status(200).json(order);
  } catch (error) {
    res.status(500).send(error);
  }
});

//add amount to wallet
const AddAmountToWallet = asyncHandler(async (req, res) => {
  const ID = req.body.id;
  const amount = req.body.Amount;
  const updatewallet = await db
    .get()
    .collection(collection.WHOLESALER_COLLECTION)
    .updateOne(
      {
        CUST_ID: parseInt(ID),
      },
      { $inc: { wallet: parseInt(amount) } }
    );
  if (updatewallet) {
    res.status(200).json("Success");
  } else {
    res.status(500).json("Somthing Went wrong");
  }
});

const CheckUserId = asyncHandler(async (req, res) => {
  const userid = req.body.userid;

  const user = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .findOne({ CUST_ID: parseInt(userid) });

  if (user) {
    res.status(200).json(user);
  } else {
    const wholeSaler = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .findOne({ CUST_ID: parseInt(userid) });
    if (wholeSaler) {
      res.status(200).json(wholeSaler);
    } else {
      res.status(200).json("failed");
    }
  }
});
module.exports = {
  addToCart,
  registerUser,
  getCartProduct,
  Phoneverification,
  loginUser,
  VerifyPhone,
  cheackOtp,
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
  removeProductCart,
  razorpayIntegration,
  rezorpayOrder,
  createOrderObjct,
  deleteuserCart,
  AddAmountToWalletRazorpay,
  AddAmountToWallet,
  verificationPayment,
  CheckUserId,
};
