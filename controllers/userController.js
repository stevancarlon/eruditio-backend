const User = require("../models/userModel");
const Book = require("../models/bookModel");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Token = require("../models/tokenModel");
const sendEmail = require("../utils/sendEmail");
const cloudinary = require("cloudinary").v2;

// Generate Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// Register a user
const registerUser = async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// Login User
const loginUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400);
        throw new Error("Username and password cannot be null.");
    }

    const user = await User.findOne({ username });

    if (!user) {
        res.status(400);
        throw new Error("User not found, you must sign up first.");
    }

    const passwordIsCorrect = await bcrypt.compare(password, user.password);

    const token = generateToken(user._id);

    if (passwordIsCorrect) {
        res.cookie("token", token, {
            path: "/",
            httpOnly: true,
            expires: new Date(Date.now() + 1000 * 86400),
            sameSite: "none",
            secure: false,
        });
    }

    if (user && passwordIsCorrect) {
        const { _id, username } = user;
        res.status(200).json({
            _id,
            username,
        });
    } else {
        res.status(400);
        throw new Error("Invalid email or password.");
    }
});

// Get login status
const loginStatus = asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.json({ loginStatus: false });
    }
    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (verified) {
        return res.json({ loginStatus: true });
    }
    return res.json({ loginStatus: false });
});

// Logout User
const logout = asyncHandler(async (req, res) => {
    console.log("Logging out...");
    res.cookie("token", "", {
        path: "/",
        httpOnly: true,
        expires: new Date(0),
        sameSite: "none",
        secure: true,
    });
    return res.status(200).json({ message: "Successfully Logged Out" });
});

const addImage = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username: username });

    // console.log(books)
    const books = await Book.find({})
    
    // console.log(books)

    let uploadedFile;

    if (req.file) {
        try {
            uploadedFile = await cloudinary.uploader.upload(req.file.path, {
                folder: "profilePictures",
                resource_type: "image",
            });
        } catch (error) {
            res.status(500);
            throw new Error("Image could not be uploaded.");
        }
    }
    console.log('// before getting renew_comments')

    for (let i = 0; i < books.length; i++) {
        for (let j = 0; j < books[i].comments.length; j++) {
            if (books[i].comments[j].username === username) {
                books[i].comments[j].image = uploadedFile.secure_url;
                books[i].markModified('comments');
            }
        }
        try {
            await books[i].save();
        } catch (error) {
            console.log(error);
        }
    }
    

    console.log(books)
    console.log(typeof books)

    user.image = uploadedFile.secure_url;
    user.save();

    res.status(200).json({ message: "Image added successfully." });
});

const getUser = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username: username });

    if (user) {
        res.status(200).json({
            id: user._id,
            username: user.username,
            favorites: user.favorites,
            image: user.image,
            about: user.about,
            comments: user.comments
        });
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

const editAbout = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { about } = req.body;

    const user = await User.findOne({ username: username });

    if (user) {
        console.log("Saving about...");
        console.log(about);
        user.about = about;
        user.save();
        res.status(200).json({ about: about });
    }
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error("User does not exist");
    }

    // Delete token if it exists in db
    let token = await Token.findOne({userId: user._id})
    if (token) {
        await token.deleteOne()
    }

    // create reset token
    let resetToken = crypto.randomBytes(32).toString("hex") + user._id;
    console.log(resetToken);

    // hash token before saving to db
    const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

        await new Token({
            userId: user._id,
            token: hashedToken,
            createdAt: Date.now(),
            expiresAt: Date.now() + 30 * ( 60 * 1000) // thirty minutes
        }).save()

        // construct reset url
        const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`

        // reset email
        const message = `
            <h2>Hello ${user.username}</h2>
            <p>Use the url below to reset your password.</p>
            <p>This reset link is valid for only 30 minutes.</p>
            <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
        `
        const subject = "Password reset request"
        const send_to = user.email
        const sent_from = process.env.EMAIL_USER
        
        try {
            await sendEmail(subject, message, send_to, sent_from)
            res.status(200).json({success: true, message: "Reset email sent"})
        } catch (error) {
            res.status(500)
            throw new Error("Email not sent, please try again")
        }

});

// reset password 
const resetPassword = asyncHandler (async (req, res) => {
    
    const {password} = req.body
    const {resetToken} = req.params

    
    // Hash token, then compare to token in db
    const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

    // Find token in db
    const userToken = await Token.findOne({
        token: hashedToken,
        expiresAt: {$gt: Date.now()}
    })

    if (!userToken) {
        res.status(404)
        throw new Error("Invalid or expired link.")
    } 

    // find user
    const user = await User.findOne({_id: userToken.userId})
    user.password = password
    await user.save()
    res.status(200).json({message: "Password reseted successfully."})

})

const changeEmail = asyncHandler (async (req, res) => {
    const {username, email} = req.body

    const user = await User.findOne({username})
    user.email = email
    user.save()

    res.status(200).json({message: "E-mail changed successfully."})

})

const changePassword = asyncHandler (async (req, res) => {
    const {username, oldPass, newPass} = req.body

    const user = await User.findOne({username})

    console.log(username)
    console.log(oldPass)

    const passwordIsCorrect = await bcrypt.compare(oldPass, user.password);

    if(passwordIsCorrect) {
        user.password = newPass
        user.save()
        res.status(200).json({message: 'Password changed.'})
    } else {
        res.status(400).json({message: 'Password incorrect'})
        console.log('Error on changing password.')
    }

})

module.exports = {
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
};
