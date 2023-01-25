const Book = require("../models/bookModel");
const asyncHandler = require("express-async-handler");
const { fileSizeFormatter } = require("../utils/fileUpload");
const User = require("../models/userModel");
const cloudinary = require("cloudinary").v2
const crypto = require('crypto') 
const fs = require('fs');


const addBook = asyncHandler(async (req, res) => {
    const { title, author, genre, synopsis } = req.body;

    // console.log(req.file)
    // console.log(pdf_file)

    const image = req.files.image[0]
    const pdf_file = req.files.pdf_file[0];
    const pdf_path = pdf_file.path

    let genreArray = genre.split(',')
    
    let fileData = {}

    if (req.files.image[0]) {
        let uploadedFile
        try {
            uploadedFile = await cloudinary.uploader.upload(req.files.image[0].path, {folder: "bookCover", resource_type: "image"})
        } catch (error) {
            res.status(500)
            throw new Error("Image could not be uploaded.")
        }

        console.log(uploadedFile)

        fileData = {
            fileName: req.files.image[0].originalname,
            filePath: uploadedFile.secure_url,
            fileType: req.files.image[0].mimetype,
            fileSize: fileSizeFormatter(req.files.image[0].size, 2),
        }
    }

    // Create book
    try {
        const user = await Book.create({
            title,
            author,
            genre: genreArray,
            synopsis,
            image: fileData,
            pdf: pdf_path
        });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
})

const getBooks = asyncHandler(async (req, res) => {
    const books = await Book.find()
    res.status(200).json(books)
})

const favoriteBook = asyncHandler(async(req, res) => {
    console.log("Bookmarking...")

    const {user_id, username} = req.body
    const {book_id} = req.params

    const user = await User.findOne({_id: user_id})
    const book = await Book.findOne({_id: book_id})

    if (!user) {
        res.status(400).json({error: 'User not found'})
    }

    if (!book) {
        res.status(400).json({error: 'Book not found'})
    }

    const checkFavorite = user.favorites.filter((favorite) => {
        return favorite._id.equals(book._id)
    })

    if(checkFavorite.length > 0) {
        let filteredFavorites = user.favorites.filter(favorite => !favorite._id.equals(book._id))
        user.favorites = filteredFavorites
        user.save()
        console.log('Book removed from favorites.')
        res.status(200).json({favorited: false})
    } else {
        user.favorites.push(book)
        user.save()
        console.log('Book saved to favorites.')
        res.status(200).json({favorited: true})
    }
})

const isFavorited = asyncHandler(async (req, res) => {
    const {user_id, username} = req.body
    const {book_id} = req.params

    const user = await User.findOne({_id: user_id})
    const book = await Book.findOne({_id: book_id})


    if(!user) {
        return res.status(404).json({error: "User not found."})
    }

    if(!book) {
        return res.status(404).json({error: "Book not found."})
    }

    // console.log(user.favorites)
    // console.log(book._id)

    const favoriteStatus = user.favorites.filter((favorite) => {
        
        return favorite._id.equals(book._id)
    })

    if(favoriteStatus.length > 0) {
        res.status(200).json({favoriteStatus: true})
    }else{
        res.status(200).json({favoriteStatus: false})
    }

})

const getFavorites = asyncHandler(async (req, res) => {

    const username = req.params.username
    const user = await User.findOne({username: username})

    let listOfBookId = []
    for (let i = 0; i < user.favorites.length; i++) {
        listOfBookId.push(user.favorites[i]._id)
    }

    let listOfFavorites = []

    listOfFavorites = await Promise.all(listOfBookId.map(async (book_id) => {
        return await Book.findOne({_id: book_id})
    }))

    console.log('Returning list of favorites...')

    listOfFavorites = listOfFavorites.filter((favorite) => favorite != null)

    res.status(200).json({favoriteBooks: listOfFavorites})
})

const addComment = asyncHandler(async(req, res) => {
    const { book_id } = req.params
    const { user_id, username, comment, image } = req.body
    
    const book = await Book.findOne({_id: book_id})
    const user = await User.findOne({username})

    let date = new Date(Date.now())
    let formattedDate = date.toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'})

    const comment_id = crypto.randomBytes(16).toString('hex')
    
    user.comments.push({comment_id, book_id: book._id, book_title: book.title, comment, is_edited: false})
    book.comments.push({comment_id, user_id, username, comment, date: formattedDate, image, is_edited: false})
    book.save()
    user.save()
    
    res.status(200).json({message: 'Comment added.'})
})

const getComments = asyncHandler(async(req, res) => {
    const { book_id } = req.params

    // console.log(book_id)

    const book = await Book.findOne({_id: book_id})

    if(book) {
        res.status(200).json(book.comments)
    } else {
        res.status(400).json({error: 'Book not found.'})
    }
})

const currentBook = asyncHandler(async(req, res) => {
    const { book_id } = req.params

    // console.log(book_id)

    const book = await Book.findOne({_id: book_id}) 

    if(book) {
        res.status(200).json(book)
    } else {
        res.status(400).json({error: 'Book not found.'})
    }
})

const deleteComment = asyncHandler(async(req, res) => {
    const { book_id } = req.params
    const { comment_id, username } = req.body

    const book = await Book.findOne({_id: book_id})
    const user = await User.findOne({username})

    const new_book_comments = book.comments.filter(comment => {
        return comment.comment_id != comment_id
    })

    const new_user_comments = user.comments.filter(comment => {
        return comment.comment_id != comment_id
    })

    book.comments = new_book_comments
    book.markModified('comments');
    book.save()

    console.log(new_user_comments)

    user.comments = new_user_comments
    user.markModified('comments')
    user.save()

    // console.log('Controller function triggered.')
    res.status(200).json({message: "Comment deleted."})

})

const editComment = asyncHandler(async(req, res) => {
    const { book_id } = req.params
    const { comment_id, username, new_comment } = req.body

    const book = await Book.findOne({_id: book_id})
    const user = await User.findOne({username})

    const new_book_comments = book.comments.map(comment => {
        if(comment.comment_id === comment_id) {
            return {...comment, comment: new_comment, is_edited: true }
        }
        return comment
    })

    const new_user_comments = user.comments.filter(comment => {
        if(comment.comment_id === comment_id) {
            return {...comment, comment: new_comment, is_edited: true }
        }
        return comment
    })

    book.comments = new_book_comments
    book.markModified('comments');
    book.save()

    user.comments = new_user_comments
    user.markModified('comments')
    user.save()

    res.status(200).json({message: "Comment edited."})

})

module.exports = {
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
};
