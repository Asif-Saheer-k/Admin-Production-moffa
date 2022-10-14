const express = require("express");
const dotenv = require("dotenv");
const db = require("./config/db");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/userRoutes");
const superAdmin=require('./routes/superAdminRoutes')
const path=require('path')
const { notFound,errorHandler } = require("./errormiddleware/errorMidlleware");


const app = express();
dotenv.config();
app.use(express.json());
app.use(cookieParser());

// app.use(notFound);
// app.use(errorHandler);
const PORT = process.env.PORT || 9000;
app.use(session({ secret: "key", cookie: { maxAge: 6000000 } }));

app.use("/api/user",userRoutes);  
app.use("/api/superAdmin",superAdmin); 

//  ------------------deployment-----------------------
__dirname =path.resolve()   
if(process.env.NODE_ENV==="production"){
  app.use(express.static(path.join(__dirname,"/frontend/build")));
  app.get("*",(req,res)=>{
    res.sendFile(path.resolve(__dirname,'frontend','build','index.html'))
  })
}  
  
db.connect((err) => {  
  if (err){ console.log("connection error" + err);
}
  else {console.log("database connected");
}                  
});
app.listen(PORT, console.log(`server started on PORT ${PORT}`));
        