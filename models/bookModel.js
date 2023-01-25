const mongoose = require("mongoose")

const bookSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Error: add a title."]
        },
        author: {
            type: String,
            required: [true, "Error: add an author."]
        },
        genre: {
            type: [String],
            required: [true, "Error: add an genre."]
        },
        synopsis: {
            type: String,
            required: [true, "Error: add an synopsis."]
        },
        image: {
            type: Object,
            required: [true, "Error: add an image."]
        },
        comments: {
            type: [Object],
            required: false
        },
        pdf: {
            type: String,
            required: false
        }
    },
    {
        timestamps: true
    }
)

const Book = mongoose.model("Book", bookSchema)
module.exports = Book