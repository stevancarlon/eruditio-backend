const express = require("express");
const {
    addBook,
    getBooks,
    favoriteBook,
    isFavorited,
    getFavorites,
    addComment,
    getComments,
    currentBook,
    deleteComment,
    editComment
} = require("../controllers/bookController");
const { upload } = require("../utils/fileUpload");
const router = express.Router();
const protect = require("../middleWare/authMiddleware");
const Book = require("../models/bookModel");

router.post("/add_book", protect, upload.fields([{ name: "image", maxCount: 1 }, { name: "pdf_file", maxCount: 1 }]), addBook);
router.get("/get_books/", protect, getBooks);
router.get("/current_book/:book_id", protect, currentBook);
router.put("/favorite_book/:book_id", protect, favoriteBook);
router.post("/favorite_book/:book_id", protect, isFavorited);
router.get("/get_favorites/:username", protect, getFavorites);
router.post("/add_comment/:book_id", protect, addComment);
router.get("/get_comments/:book_id", protect, getComments);
router.post("/delete_comment/:book_id", protect, deleteComment);
router.put("/edit_comment/:book_id", protect, editComment);
router.get("/download_book/:id", async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
        const pdfPath = book.pdf

        if (pdfPath) {
            res.download(pdfPath)
        } else {
            res.status(404).send("Not Found")
        }
    } catch (error) {
        res.status(500).send(error)
    }
})

module.exports = router;
