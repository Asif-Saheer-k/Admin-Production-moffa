const asyncHandler = require("express-async-handler");
const db = require("../config/db");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/jwtToken");
const collection = require("../config/collection");
const Paytm = require("paytmchecksum");
const verification = require("../middleware/tiwllioVerification");
const PaytmChecksum = require("../utils/PaytmCecksum");
const fromidable = require("formidable");
const { v4: uuidv4 } = require("uuid");
const https = require("https");

//login deatails
//user register controller with otp verification
const registerUser = asyncHandler(async (req, res) => {
  req.session.userDeatails = req.body;
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
      // no registerd number
      const code = await verification.sendOtp(req.session.userDeatails.phone);
      if (code) {
        res.status(200).json("OTP Sented Successfully");
      } else {
        res.status(401).json("Invalid Phone number");
      }
    }
  }
});

//reset otp function
const ResetOtpSend = asyncHandler(async (req, res) => {
  const code = await verification.sendOtp(req.session.userDeatails.phone);
  if (code) {
    res.status(200).json("OTP Sented Successfully");
  } else {
    res.status(401).json("Invalid Phone number");
  }
});

// Otp verification function
const Phoneverification = asyncHandler(async (req, res) => {
  let UserId = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .find()
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
  let ID;
  if (UserId[0]) {
    console.log(UserId[0].CUST_ID);
    ID = UserId[0]?.CUST_ID + 1;
  } else {
    ID = 10000000;
  }
  console.log(ID);

  const Otp = req.params.otp;
  const userData = req.session.userDeatails;
  userData.CUST_ID = ID;
  console.log(userData.phone);
  console.log(Otp);
  if (!req.session.userDeatails) {
    res.status(500).json("Somthing went wrong");
  }
  const phoneNumber = req.session.userDeatails.phone;
  userData.password = await bcrypt.hash(userData.password, 10);
  const code = await verification.CheckOtp(phoneNumber, Otp);
  // check valid true or false
  if (code.valid) {
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
});

//login user
const loginUser = asyncHandler(async (req, res) => {
  const Email = req.body.email;
  const Password = req.body.password;
  //check email in database
  const userDeatails = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .findOne({ email: Email });
  if (userDeatails) {
    //compate entered password and database password
    bcrypt.compare(Password, userDeatails.password).then((status) => {
      if (status) {
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
        });
      } else {
        res.status(500).json("Invalid Password");
      }
    });
  } else {
    const Wholesaler = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .findOne({ email: Email });

    if (Wholesaler) {
      bcrypt.compare(Password, Wholesaler.password).then((status) => {
        if (status) {
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
          });
        } else {
          res.status(401).json("Invalid Password");
        }
      });
    } else {
      res.status(401).json("Invalid Email Address");
    }
  }
});

//otp login verify phone number function
const VerifyPhone = asyncHandler(async (req, res) => {
  const phoneNumber = req.body.phone;
  const userDeatails = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .findOne({ phone: phoneNumber });
  if (userDeatails) {
    //send otp function
    const code = await verification.sendOtp(phoneNumber);
    if (code) {
      req.session.userverify = true;
      req.session.otpLogin = userDeatails;
      res.status(200).json("OTP Sented Successfuly");
    } else {
      res.status(500).json("Somthing Went Wrong");
    }
  } else {
    const wholesalerDeatails = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .findOne({ phone: phoneNumber });
    req.session.userverify = false;
    req.session.otpLogin = wholesalerDeatails;
    if (wholesalerDeatails) {
      const code = await verification.sendOtp(phoneNumber);
      res.status(200).json("OTP Sented Successfuly");
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
    const code = await verification.CheckOtp(users.phone, Otp);
    if (code.valid) {
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
      });
    } else {
      res.status(401).json("Invalid Otp Please verify Otp");
    }
  } else {
    const code = await verification.CheckOtp(users.phone, Otp);
    if (code.valid) {
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
      });
    } else {
      res.status(401).json("Invalid Otp Please verify Otp");
    }
  }
});

//payment integration function
const PaytmIntegration = asyncHandler(async (req, res) => {
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
  const DeliveyCharge = req.body.DeliveyCharge;
  const DeliveryType = req.body.DeliveryType;
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
      Date: date,
      user: user,
      role: Role,
      DeliveyCharge: DeliveyCharge,
      DeliveryType: DeliveryType,
      wallet: Applywallet,
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
      Date: date,
      user: user,
      role: Role,
      DeliveyCharge: DeliveyCharge,
      DeliveryType: DeliveryType,
      status: "Pending",
      Payment: "Pending",
    };
    req.session.orderProducts = OrderObject;
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
              paytmParams["MID"] = process.env.MID;
              paytmParams["ORDER_ID"] = uuid;
              paytmParams["TXN_AMOUNT"] = `${Amount}`;
              paytmParams["WEBSITE"] = process.env.WEBSITE;
              paytmParams["INDUSTRY_TYPE_ID"] = process.env.INDUSTRY_TYPE_ID;
              paytmParams["CHANNEL_ID"] = process.env.CHANNEL_ID;
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
                  `${process.env.KEY}#`
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
                    console.log(error);
                  });
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
      `${process.env.KEY}#`,
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
        `${process.env.KEY}#`
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
          hostname: "securegw-stage.paytm.in",

          /* for Production */
          // hostname: 'securegw.paytm.in',

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
              console.log(req.session.orderProducts,"ASXXXX");
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
                        console.log(sizesObj.stock);
                        console.log(products.quantity);
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
                        } else {
                          res.redirect("/checkout");
                        }
                      }
                    });
                  }
                });
              });
              console.log(result.body.resultInfo.resultStatus);

              const success = await db
                .get()
                .collection(collection.ORDER_COLLECTION)
                .insertOne(order);
              if (success) {
                req.session.orderProducts = null;
                req.session.Applywallet = null;
                return res.redirect("/success");
              } else {
                return res.redirect("/error");
              }
            } else if (result.body.resultInfo.resultStatus == "PENDING") {
              res.redirect("/error");
            } else {
              res.send(result.body.resultInfo.resultMsg);
              console.log(result.body.resultInfo.resultMsg);
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
//add to cart
// const addToCart = asyncHandler((req, res) => {
//   const proId = req.body.prductId;
//   const userId = req.body.userId;
//   const proObj = {
//     item: objectId(proId),
//     quantity: 1,
//   };
//   return new promise(async (resolve, reject) => {
//     let userCart = await db
//       .get()
//       .collection(collection.CART_COLLECTION)
//       .findOne({ user: objectId(userId) });
//     if (userCart) {
//       let proExist = userCart.products.findIndex(
//         (product) => product.item == proId
//       );
//       if (proExist != -1) {
//         db.get()
//           .collection(collection.CART_COLLECTION)
//           .updateOne(
//             { user: objectId(userId), "products.item": objectId(proId) },
//             {
//               $inc: { "products.$.quantity": 1 },
//             }
//           )
//           .then((data) => {
//             res.status(200).json({ status: "quantity updated" });
//           })
//           .catch((erorr) => {
//             res.status(500).json({ err: "Somthing went wrong..." });
//           });
//       } else {
//         db.get()
//           .collection(collection.CART_COLLECTION)
//           .updateOne(
//             { user: objectId(userId) },
//             {
//               $push: { products: proObj },
//             }
//           )
//           .then((response) => {
//             res.status(200).json({ status: "Product Added" });
//           })
//           .catch((error) => {
//             res.status(500).json({ err: "Something went wrong...." });
//           });
//       }
//     } else {
//       let cartObj = {
//         user: objectId(userId),
//         products: [proObj],
//       };
//       db.get()
//         .collection(collection.CART_COLLECTION)
//         .insertOne(cartObj)
//         .then((response) => {
//           res.status(200).json({ status: "Cart updated" });
//         })
//         .catch((error) => {
//           res.status(500).json({ err: "Something went wrong...." });
//         });
//     }
//   });
// });

//get user cart product
// const getCartProduct = asyncHandler(async (req, res) => {
//   const userId = req.params.id;
//   return new promise(async (resolve, reject) => {
//     let cartItems = await db
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
//       ])
//       .toArray();
//     console.log("itemsCart");
//     console.log(cartItems);
//     if (cartItems) {
//       res.status(200).json(cartItems);
//     } else {
//       res.status(401).json({ status: "Cart Empty" });
//     }
//   });
// });

//reomove product from cart function
// const removeProductCart = asyncHandler(async (req, res) => {
//   const CartID = req.body.cart;
//   const ProductID = req.body.Product;
//   return new promise((resolve, reject) => {
//     console.log("detaid");
//     console.log(details);
//     db.get()
//       .collection(collection.CART_COLLECTION)
//       .updateOne(
//         { _id: objectId(CartID) },
//         {
//           $pull: { products: { item: objectId(ProductID) } },
//         }
//       )
//       .then((response) => {
//         if (response) {
//           res.status(200).json({ deleted: true });
//         } else {
//           res.status(500).json({ err: "Somthing went wrong...." });
//         }
//       });
//   });
// });

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
  console.log(deletes, "");
  if (deletes) {
    await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .updateOne({ "Deal.date": PreviousDay }, { $unset: { Deal: " " } });
    console.log("kk");
    res.status(200).json("Success");
  } else {
    console.log("ll");
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
  console.log(PreviousDay, "s");
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
      .findOne({ phone: Deatails.phones });
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
      .findOne({ phone: Deatails.phones });
    if (wholesalerDeatails) {
      const obj = {
        name: wholesalerDeatails.name,
        email: wholesalerDeatails.email,
        phone: wholesalerDeatails.phone,
        wallet: wholesalerDeatails.wallet,
        user: false,
        Address: wholesalerDeatails.Address,
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
  paytmParams["MID"] = process.env.MID;
  paytmParams["ORDER_ID"] = userId;
  paytmParams["TXN_AMOUNT"] = Amount;
  paytmParams["WEBSITE"] = process.env.WEBSITE;
  paytmParams["INDUSTRY_TYPE_ID"] = process.env.INDUSTRY_TYPE_ID;
  paytmParams["CHANNEL_ID"] = process.env.CHANNEL_ID;
  paytmParams["CUST_ID"] = ID;
  paytmParams["MOBILE_NO"] = phone;
  paytmParams["EMAIL"] = email;
  paytmParams["CALLBACK_URL"] =
    "http://localhost:3000/api/user/add-wallet-ammount";
  var paytmChecksum = PaytmChecksum.generateSignature(
    paytmParams,
    `${process.env.KEY}#`
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
      `${process.env.KEY}#`,
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
        `${process.env.KEY}#`
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
          hostname: "securegw-stage.paytm.in",

          /* for Production */
          // hostname: 'securegw.paytm.in',

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
            } else if (result.body.resultInfo.resultStatus == "PENDING") {
              return res.redirect("/error");
            } else {
              res.send(result.body.resultInfo.resultMsg);
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
module.exports = {
  registerUser,
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
};
