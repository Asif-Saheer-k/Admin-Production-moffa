const uploadImage = asyncHandler(async (req, res) => {
    try {
      const filestr = req.body.base64EncodedImage;
  
      const uploadedResponse = await cloudinary.uploader.upload(filestr, {
        upload_preset: "dev_setups",
      });
      console.log(uploadedResponse.url);
      res.status(200).json(uploadedResponse.url);
    } catch (error) {
      console.log(error);
      res.status(500).json({ err: "somthing wrong" });
    }
    console.log("hooi");
  });
  module.exports=uploadImage;