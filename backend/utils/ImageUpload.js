const uploadImage = asyncHandler(async (req, res) => {
    try {
      const filestr = req.body.base64EncodedImage;
  
      const uploadedResponse = await cloudinary.uploader.upload(filestr, {
        upload_preset: "dev_setups",
      });
      
      res.status(200).json(uploadedResponse.url);
    } catch (error) {
      
      res.status(500).json({ err: "somthing wrong" });
    }

  });
  module.exports=uploadImage;