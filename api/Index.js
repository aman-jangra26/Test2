const express = require('express');
const router = express.Router();
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const fs = require('fs');

const salt = bcrypt.genSaltSync(10);
const secret = 'kjfbejajbgfiuwu392rjdvjsdgwrugvisjdnvlhg9r';

const corsOptions = {
  credentials: true,
  origin: ['http://localhost:3000']
};

router.use(cors(corsOptions));
mongoose.connect(process.env.DB_URL);
router.use(express.json());
router.use(cookieParser());

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog_images', // Or any folder you prefer in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});


router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const UserDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt)
    });
    res.json(UserDoc);
  } catch (e) {
    res.status(400).json(e);
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const UserDoc = await User.findOne({ username });
  const passok = bcrypt.compareSync(password, UserDoc.password);
  if (passok) {
    jwt.sign({ username, id: UserDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token).json({
        id: UserDoc._id,
        username
      });
    });
  } else {
    res.status(400).json('wrong credentials');
  }
});

router.get('/profile', (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

router.post('/logout', (req, res) => {
  res.cookie('token', '').json('ok');
});

router.post('/post', multer({ storage: storage }).single('file'), async (req, res) => {
  const { title, summary, content } = req.body;
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: req.file ? req.file.path : null,
      author: info.id,
    });
    res.json(postDoc);
  });
});


router.put('/post', multer({ storage: storage }).single('file'), async (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    if (!postDoc) {
      return res.status(404).json('Post not found');
    }
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('You are not the author');
    }

    // Update the post with the new data and cover image URL if available
    postDoc.title = title;
    postDoc.summary = summary;
    postDoc.content = content;
    if (req.file) {
      // Upload the new image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);
      postDoc.cover = result.secure_url;

      // Remove the temporary file after upload (Not necessary for Cloudinary)
      // fs.unlinkSync(req.file.path);
    }

    await postDoc.save();
    res.json(postDoc);
  });
});


router.get('/post', async (req, res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

router.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  if (!postDoc) {
    return res.status(404).json('Post not found');
  }
  res.json(postDoc);
});


module.exports = router;
//mongodb+srv://blogit:XbxGk2uinecT3NUI@blogcluster0.idzmzcj.mongodb.net/?retryWrites=true&w=majority