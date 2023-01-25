const express = require("express");
const {
    registerUser,
    loginUser,
    loginStatus,
    logout,
    addImage,
    getUser,
    editAbout,
    forgotPassword,
    resetPassword,
    changeEmail,
    changePassword
} = require("../controllers/userController");
const router = express.Router();
const { upload } = require("../utils/fileUpload");
const protect = require("../middleWare/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/loggedin", loginStatus);
router.get("/logout", logout);
router.put("/add_image/:username", protect, upload.single("image"), addImage);
router.get("/get_user/:username", protect, getUser);
router.put("/edit_about/:username", protect, editAbout);
router.post("/forgotpassword", forgotPassword);
router.put("/resetpassword/:resetToken", resetPassword);
router.put("/change_email/", protect, changeEmail);
router.put("/changepassword/", protect, changePassword)

module.exports = router;
