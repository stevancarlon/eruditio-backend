const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, "Error: add a username."]
        },
        email: {
            type: String,
            required: [true, "Error: add a username."]
        },
        password: {
            type: String,
            required: [true, "Error: add a password."]
        },
        favorites: {
            type: [Object],
            required: false
        },
        image: {
            type: String,
            required: false
        },
        about: {
            type: String,
            required: false
        },
        comments: {
            type: [Object],
            required: false
        }
    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) {
        return next()
    }

    // Hash pass
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(this.password, salt)
    this.password = hashedPassword
    next()
})

const User = mongoose.model("User", userSchema)
module.exports = User