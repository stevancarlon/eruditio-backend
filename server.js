const dotenv = require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoute");
const bookRoutes = require("./routes/bookRoute");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path")


const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "https://mern-task-app777.onrender.com",
        ],
        credentials: true,
    })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")))
 
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);


const PORT = process.env.PORT || 5000;
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => console.log(error));
