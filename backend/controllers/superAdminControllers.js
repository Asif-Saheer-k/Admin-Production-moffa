const asyncHandler = require("express-async-handler");
const db = require("../config/db");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/jwtToken");
const collection = require("../config/collection");
const objectId = require("mongodb").ObjectId;
const verification = require("../middleware/tiwllioVerification");

//super Admin Login function
const verifyAdmin = asyncHandler(async (req, res) => {
  const Email = req.body.email;
  const Password = req.body.password;
  const superAdmin = true;
  if (Email == process.env.SUPER_ADMIN) {
    bcrypt.compare(Password, process.env.SUPER_ADMIN_PASSWORD).then((resp) => {
      if (resp) {
        const Token = generateToken(Password);
        res.status(200).json({
          Email,
          Token,
          superAdmin,
        });
      } else {
        res.status(401).json("Password Incorrect");
      }
    });
  } else {
    const Admin = await db
      .get()
      .collection(collection.ADMIN_COLLECTION)
      .findOne({ email: Email });

    if (Admin) {
      bcrypt.compare(Password, Admin.password).then((status) => {
        if (status) {
          const superAdmin = false;
          const Token = generateToken(Password);
          res.status(200).json({
            Email,
            Token,
            superAdmin,
          });
        } else {
          res.status(401).json("Invalid Password");
        }
      });
    } else {
      res.status(401).json("Invalid Email ID");
    }
  }
});

//delete admin routes
const deleteAdmin = asyncHandler((req, res) => {
  const Id = req.body.id;

  return new Promise(async (response, reject) => {
    db.get()
      .collection(collection.ADMIN_COLLECTION)
      .deleteOne({ _id: objectId(Id) })
      .then((resp) => {
        res.status(200).json("Success");
      })
      .catch((error) => {
        res.status(500).json("Somthing Went Wrong");
      });
  });
});

//find admin
const AllAdmins = asyncHandler((req, res) => {
  return new Promise(async (resp, rejec) => {
    await db
      .get()
      .collection(collection.ADMIN_COLLECTION)
      .find()
      .toArray()
      .then((adminDeatails) => {
        res.status(200).json(adminDeatails);
      })
      .catch((err) => {
        res.status(500).json(err);
      });
  });
});

//admin creation in super admin
const MakeAdmin = asyncHandler(async (req, res) => {
  const adminData = req.body;
  adminData.password = await bcrypt.hash(adminData.password, 10);
  // const Exist = await db
  //   .get()
  //   .collection(collection.ADMIN_COLLECTION)
  //   .findOne({ email: adminData.email })
  // if (!Exist) {
  return new Promise(async (resp, reje) => {
    await db
      .get()
      .collection(collection.ADMIN_COLLECTION)
      .insertOne(adminData)
      .then((resp) => {
        res.status(200).json("Success");
      })
      .catch((error) => {
        res.status(402).json("Somthing Went Wrong");
      });
  });
  // } else {
  //   res.status(400).json("Email ID Already Exist");
  // }
});

//view All user function
const viewAllUser = asyncHandler(async (req, res) => {
  const AllUser = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .find()
    .toArray();
  if (AllUser) {
    res.status(200).json(AllUser);
  } else {
    res.status(500).json({
      errr: "somthing wrong....",
    });
  }
});

//delete user function
const deleteuser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const deletes = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .deleteOne({ _id: objectId(id) });
  if (deletes) {
    res.status(200).json("sucess");
  } else {
    res.status(500).json("Somthing went wrong");
  }
});

//add banner function
const addBanner = asyncHandler(async (req, res) => {
  const banner = req.body;
  const ProID = banner.url;
  const Product = await db
    .get()
    .collection(collection.PRODUCT_COLLECTION)
    .findOne({ id: ProID });
  if (Product) {
    const bannerDeatails = await db
      .get()
      .collection(collection.BANNER_COLLECTION)
      .insertOne(banner);
    if (bannerDeatails) {
      res.status(200).json("success");
    } else {
      res.status(401).json("Somthing went wrong");
    }
  } else {
    res.status(404).json("Product Id Invalid");
  }
});

//view all banner
const viewAllBanner = asyncHandler(async (req, res) => {
  const banner = await db
    .get()
    .collection(collection.BANNER_COLLECTION)
    .find()
    .toArray();
  if (banner) {
    res.status(200).json(banner);
  } else {
    res.status(400).json("Somthing went wrong");
  }
});

//delete banner function
const deleteBanner = asyncHandler((req, res) => {
  const bannerId = req.body;
  return new Promise(async (resp, reject) => {
    await db
      .get()
      .collection(collection.BANNER_COLLECTION)
      .deleteOne({ _id: objectId(bannerId) })
      .then((data) => {
        res.status(200).json("success");
      })
      .catch((eror) => {
        res.status(500).json("Somthing went wrong");
      });
  });
});

//view All wholeSalers request
const viewAllWholesalersRequest = asyncHandler((req, res) => {
  return new Promise(async (response, reject) => {
    await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .find({ valid: false })
      .toArray()
      .then((resp) => {
        res.status(200).json(resp);
      })
      .catch((error) => {
        res.status(500).json({
          error: "Something went Wrong ...",
        });
      });
  });
});

//verify Wholesaler function
const verifyWholesalers = asyncHandler((req, res) => {
  const wholeslerID = req.params.id;

  return new Promise(async (resolve, reject) => {
    await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .updateOne(
        {
          _id: objectId(wholeslerID),
        },
        { $set: { valid: true } }
      )
      .then(async (resp) => {
        const wholeSaler = await db
          .get()
          .collection(collection.WHOLESALER_COLLECTION)
          .findOne({ _id: objectId(wholeslerID) });

        if (wholeSaler) {
          const phoneNumber = wholeSaler.phone;
          const message = await verification.SendMessage(
            phoneNumber,
            "Admin verified your deatails. happy shopping"
          );

          res.status(200).json({ success: true });
        } else {
          res.status(500).json({ error: "Somthing went wrong ...." });
        }
      })
      .catch((error) => {
        res.status(500).json({ error: "Somthing went wrong" });
      });
  });
});

//add products
const addProducts = asyncHandler(async (req, res) => {
  const product = req.body;
  const ProductId = await db
    .get()
    .collection(collection.PRODUCT_COLLECTION)
    .find()
    .sort({ _id: -1 })
    .limit(1)
    .toArray();

  if (ProductId[0]?.id) {
    const PR = ProductId[0].id.slice(6);

    const inc = parseInt(PR) + 1;

    product.id = "PRO_ID" + inc;
  } else {
    product.id = "PRO_ID100000";
  }
  product.Deal = [];
  product.hidden = false;
  return new Promise(async (resolve, reject) => {
    await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .insertOne(product)
      .then((data) => {
        res.status(200).json(data);
      })
      .catch((error) => {
        res.status(500).json("Somthing went Wrong");
      });
  });
});

//get all products from datasbase function
const viewAllProducts = asyncHandler(async (req, res) => {
  const products = await db
    .get()
    .collection(collection.PRODUCT_COLLECTION)
    .find({ hidden: false })
    .toArray();
  if (products) {
    res.status(200).json(products);
  } else {
    res.status(500).json("Somthing went wrong");
  }
});

//delete Products
const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  await db
    .get()
    .collection(collection.PRODUCT_COLLECTION)
    .updateOne({ id: productId }, { $set: { hidden: true } })
    .then((resp) => {
      if (resp) {
        res.status(200).json({
          success: true,
        });
      } else {
        res.status(500).json({
          error: "Somthing went wrong.....",
        });
      }
    });
});

//make wholesaler function in super admin side
const makeWholesaler = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await db
    .get()
    .collection(collection.USER_COLLECTION)
    .findOne({ _id: objectId(userId) });
  user.wallet = 0;
  if (user) {
    const wholesaler = await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .insertOne(user);
    res.status(200).json("New Wholesaler Added");

    if (wholesaler) {
      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .deleteOne({ _id: objectId(user._id) });
    }
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});

// view All valid whole salers
const viewAllWholsalers = asyncHandler((req, res) => {
  return new Promise(async (response, reject) => {
    await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .find()
      .toArray()
      .then((resp) => {
        res.status(200).json(resp);
      })
      .catch((erorr) => {
        res.status(500).json("Somthing wrong ...");
      });
  });
});

//delete wholesaler function
const deleteWholesalers = asyncHandler((req, res) => {
  const Id = req.params.id;
  return new Promise(async (resolve, reject) => {
    await db
      .get()
      .collection(collection.WHOLESALER_COLLECTION)
      .deleteOne({
        _id: objectId(Id),
      })
      .then((resp) => {
        res.status(200).json("Success");
      })
      .catch((err) => {
        res.status(500).json("Somthing Went wrong");
      });
  });
});
const makeUser = asyncHandler(async (req, res) => {
  const Id = req.params.id;
  const deleteWholesalers = await db
    .get()
    .collection(collection.WHOLESALER_COLLECTION)
    .deleteOne({
      _id: objectId(Id),
    });
  if (deleteWholesalers) {
    res.status(200).json("Success");
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});

//get all products from

//get all order from database function
const getAllOrders = asyncHandler(async (req, res) => {
  const order = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .find({ status: "Pending" })
    .sort({ _id: -1 })
    .toArray();
  if (order) {
    res.status(200).json(order);
  } else {
    res.status(500).json("Somthing wrong ...");
  }
});

//view single products routes
const getSingleProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  return new Promise(async (response, reject) => {
    await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .findOne({ id: productId })
      .then((resp) => {
        res.status(200).json(resp);
      })
      .catch((erorr) => {
        res.status(500).json("Somthing wrong ...");
      });
  });
});
//edit produts
const EditProducts = asyncHandler(async (req, res) => {
  const PRO_ID = req.params.id;
  const product = req.body;
  const takeProdut = await db
    .get()
    .collection(collection.PRODUCT_COLLECTION)
    .updateOne({ id: PRO_ID }, { $set: product });
  if (takeProdut) {
    res.status(200).json("Sucess");
  } else {
    res.status(500).json("Somthing went wrong");
  }
});
//view singel ordre products
const getSingleOrder = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const singlOrder = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .findOne({ Id: parseInt(orderId) });
  if (singlOrder) {
    res.status(200).json(singlOrder);
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});

//deal of the day function
const AddDealOfTheDay = asyncHandler(async (req, res) => {
  const Deals = req.body;
  const ProductID = req.body.PROID;
  const Day = { offer: req.body.OFFER, date: req.body.date };
  const AllReadyDate = await db
    .get()
    .collection(collection.DEAL_OF_THE_DAY)
    .findOne({ date: Day.date });
  if (AllReadyDate == null) {
    const Product = await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .findOne({ id: ProductID });
    if (Product) {
      const success = await db
        .get()
        .collection(collection.DEAL_OF_THE_DAY)
        .insertOne(Deals)
        .then(async (resp) => {
          await db
            .get()
            .collection(collection.PRODUCT_COLLECTION)

            .updateOne({ id: ProductID }, { $addToSet: { Deal: Day } });
        });
      res.status(200).json("Success");
    } else {
      res.status(400).json("Please Cheack Product ID");
    }
  } else {
    res.status(400).json("Please Cheack Dates");
  }
});

const viewAllDealofTheDay = asyncHandler(async (req, res) => {
  const Deals = await db
    .get()
    .collection(collection.DEAL_OF_THE_DAY)
    .find()
    .toArray();
  if (Deals) {
    res.status(200).json(Deals);
  } else {
    res.status(400).json("Somthing Went wrong");
  }
});
const DeleteDealOfTheDay = asyncHandler(async (req, res) => {
  const DealId = req.params.id;
  const DealProduts = await db
    .get()
    .collection(collection.DEAL_OF_THE_DAY)
    .findOne({ _id: objectId(DealId) });
  const ProdutsId = DealProduts.PROID;
  const offerDate = DealProduts.date;
  const Product = await db
    .get()
    .collection(collection.PRODUCT_COLLECTION)
    .updateOne({ id: ProdutsId }, { $pull: { Deal: { date: offerDate } } });
  const Deal = await db
    .get()
    .collection(collection.DEAL_OF_THE_DAY)
    .deleteOne({ _id: objectId(DealId) });

  if (Deal) {
    res.status(200).json(Deal);
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});

//get tatal income function
const TotalRevanue = asyncHandler(async (req, res) => {
  let total = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .aggregate([
      { $group: { _id: null, Total: { $sum: "$Total" } } },
      { $project: { _id: 0 } },
    ])
    .toArray();

  if (total) {
    res.status(200).json(total);
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});

const MonthlySalses = asyncHandler(async (req, res) => {
  let MonthSale = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .aggregate([
      {
        $match: {
          Payment: "Success",
        },
      },

      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$dateIso" } },
          totalAmount: { $sum: "$Total" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ])
    .toArray();
  if (MonthSale) {
    res.status(200).json(MonthSale);
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});
const ViewBottomBanner = asyncHandler(async (req, res) => {
  const BottomBanner = await db
    .get()
    .collection(collection.BOTTOM_BANNER)
    .find()
    .toArray();
  if (BottomBanner) {
    res.status(200).json(BottomBanner);
  } else {
    res.status(500).json("Somthig Went Wrong");
  }
});
const EditBottomBanner = asyncHandler(async (req, res) => {
  const obj = req.body;
  const PRO_ID = obj.ID;
  const UpdateImage = obj.image;
  const BottomImage = await db
    .get()
    .collection(collection.BOTTOM_BANNER)
    .updateOne({ id: PRO_ID }, { $set: { image: UpdateImage } });
  if (BottomImage) {
    res.status(200).json(BottomImage);
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});
//view out stock produts function
const getAllOutStock = asyncHandler(async (req, res) => {
  const OutStock = await db
    .get()
    .collection(collection.STOCK_UPDATION_COLLECTION)
    .find()
    .toArray();
  if (OutStock) {
    res.status(200).json(OutStock);
  } else {
    res.status(204).json("No documents");
  }
});
const UpdateStock = asyncHandler(async (req, res) => {
  const obj = req.body;
  const POR_ID = obj.PRO_ID;
  const color = obj.color;
  const size = obj.size;
  const newStock = obj.number;
  const var_index = obj.var_index;
  const size_index = obj.size_index;
  const ID = obj.ID;
  const update = await db
    .get()
    .collection(collection.PRODUCT_COLLECTION)
    .updateOne(
      {
        id: POR_ID,
        "variation.color": color,
        "variation.size.name": size,
      },
      {
        $set: {
          [`variation.${var_index}.size.${size_index}.stock`]: newStock,
        },
      }
    );

  if (update) {
    await db
      .get()
      .collection(collection.STOCK_UPDATION_COLLECTION)
      .deleteOne({ _id: objectId(ID) });
    res.status(200).json("Success");
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});
//delet stock function
const DeleteStock = asyncHandler(async (req, res) => {
  const ID = req.body;
  const deleted = await db
    .get()
    .collection(collection.STOCK_UPDATION_COLLECTION)
    .deleteOne({ _id: objectId(ID) });
  if (deleted) {
    res.status(200).json("Successs");
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});
//dispatch order function
const DispatchOrder = asyncHandler(async (req, res) => {
  //dispatch ID
  const DispatchId = req.body.DisPatchId;
  //phone number
  const phone = req.body.phone;
  //order ID
  const ORDER_ID = req.body.OrderID;

  //change order status function
  const ChangeOrderStatus = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .updateOne({ Id: parseInt(ORDER_ID) }, { $set: { status: "Dispatched" } });
  if (ChangeOrderStatus) {
    res.status(200).json("Success");
  } else {
    res.status(500).json("Somthing Went Wrong");
  }
});
//view all dispatch orders
const viewALLDispatchOrders = asyncHandler(async (req, res) => {
  //find dispatch orders
  const findDispatchOrders = await db
    .get()
    .collection(collection.ORDER_COLLECTION)
    .find({ status: "Dispatched" })
    .sort({ Id: -1 })
    .toArray();
  if (findDispatchOrders) {
    res.status(200).json(findDispatchOrders);
  } else {
    res.status(204).json("No Records");
  }
});
//updated wholsaler wallet function
const updatedWallet = asyncHandler(async (req, res) => {
  const ID = req.body.id;
  const amount = req.body.amoun;
  const updatewallet = await db
    .get()
    .collection(collection.WHOLESALER_COLLECTION)
    .updateOne(
      {
        _id: objectId(ID),
      },
      { $set: { wallet: parseInt(amount) } }
    );
  if (updatewallet) {
    res.status(200).json("Success");
  } else {
    res.status(500).json("Somthing Went wrong");
  }
});

module.exports = {
  verifyAdmin,
  viewAllUser,
  viewAllWholsalers,
  viewAllWholesalersRequest,
  verifyWholesalers,
  addProducts,
  deleteProduct,
  makeWholesaler,
  makeUser,
  MakeAdmin,
  AllAdmins,
  deleteAdmin,
  addBanner,
  viewAllBanner,
  deleteBanner,
  viewAllProducts,
  getAllOrders,
  getSingleProduct,
  deleteuser,
  getSingleOrder,
  EditProducts,
  AddDealOfTheDay,
  viewAllDealofTheDay,
  DeleteDealOfTheDay,
  TotalRevanue,
  MonthlySalses,
  ViewBottomBanner,
  EditBottomBanner,
  getAllOutStock,
  UpdateStock,
  DeleteStock,
  DispatchOrder,
  viewALLDispatchOrders,
  updatedWallet,
};
