
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
    throw new Error("Please configure JWT_SECRET in .env");
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Database setup
const dataFolder = path.join(__dirname, "data");
const dbFile = path.join(dataFolder, "db.json");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder);
}

if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({
        users: [],
        blogs: []
    }, null, 2));
}

function readDB() {
    return JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

function saveDB(data) {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// Authentication middleware
function authenticate(req, res, next) {

    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    try {
        const token = header.split(" ")[1];

        req.user = jwt.verify(token, process.env.JWT_SECRET);

        next();

    } catch {
        res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

// HOME / SERVER CHECK
app.get("/api/health", (req, res) => {
    res.json({
        message: "Inkora server is running",
        status: "OK"
    });
});

// USER REGISTRATION
app.post("/api/register", async (req, res) => {

    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must have at least 6 characters"
            });
        }

        const db = readDB();

        const userEmail = email.trim().toLowerCase();

        const existing = db.users.find(
            u => u.email === userEmail
        );

        if (existing) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.users.push({
            id: crypto.randomUUID(),
            name: name.trim(),
            email: userEmail,
            password: hashedPassword
        });

        saveDB(db);

        res.status(201).json({
            message: "Registration successful!"
        });

    } catch (error) {
        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// USER LOGIN
app.post("/api/login", async (req, res) => {

    try {
        const { email, password } = req.body;

        const db = readDB();

        const user = db.users.find(
            u => u.email === String(email || "").trim().toLowerCase()
        );

        if (!user || !await bcrypt.compare(password || "", user.password)) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed"
        });
    }
});

// GET ALL PUBLISHED BLOGS
app.get("/api/blogs", (req, res) => {

    const db = readDB();

    const blogs = db.blogs.filter(
        b => b.status === "Published"
    );

    res.json(blogs);
});

// GET MY BLOGS
app.get("/api/myblogs", authenticate, (req, res) => {

    const db = readDB();

    const blogs = db.blogs.filter(
        b => b.userId === req.user.id
    );

    res.json(blogs);
});

// CREATE BLOG
app.post("/api/blogs", authenticate, (req, res) => {

    const { title, category, description } = req.body;

    if (!title || !category || !description) {
        return res.status(400).json({
            message: "Please fill all required fields"
        });
    }

    const db = readDB();

    const blog = {
        id: crypto.randomUUID(),
        userId: req.user.id,
        author: req.user.name,
        title: title.trim(),
        category,
        description: description.trim(),
        status: req.body.status === "Draft" ? "Draft" : "Published",
        date: new Date().toLocaleDateString(),
        likes: 0
    };

    db.blogs.unshift(blog);
    saveDB(db);

    res.status(201).json({
        message: "Blog created successfully!",
        blog
    });
});

// UPDATE BLOG
app.put("/api/blogs/:id", authenticate, (req, res) => {

    const db = readDB();

    const blog = db.blogs.find(
        b => b.id === req.params.id &&
             b.userId === req.user.id
    );

    if (!blog) {
        return res.status(404).json({
            message: "Blog not found"
        });
    }

    const { title, category, description } = req.body;

    if (!title || !category || !description) {
        return res.status(400).json({
            message: "All required fields must be filled"
        });
    }

    blog.title = title.trim();
    blog.category = category;
    blog.description = description.trim();
    blog.status = req.body.status === "Draft" ? "Draft" : "Published";

    saveDB(db);

    res.json({
        message: "Blog updated successfully!"
    });
});

// DELETE BLOG
app.delete("/api/blogs/:id", authenticate, (req, res) => {

    const db = readDB();

    const oldLength = db.blogs.length;

    db.blogs = db.blogs.filter(
        b => !(b.id === req.params.id && b.userId === req.user.id)
    );

    if (db.blogs.length === oldLength) {
        return res.status(404).json({
            message: "Blog not found"
        });
    }

    saveDB(db);

    res.json({
        message: "Blog deleted successfully!"
    });
});

// LIKE BLOG
app.patch("/api/blogs/:id/like", (req, res) => {

    const db = readDB();

    const blog = db.blogs.find(
        b => b.id === req.params.id && b.status === "Published"
    );

    if (!blog) {
        return res.status(404).json({
            message: "Blog not found"
        });
    }

    blog.likes = (blog.likes || 0) + 1;

    saveDB(db);

    res.json({
        message: "Blog liked!",
        likes: blog.likes
    });
});

// START SERVER
app.listen(PORT, () => {
    console.log("================================");
    console.log("       INKORA BLOG SERVER       ");
    console.log("================================");
    console.log(`Server running: http://localhost:${PORT}`);
});
