const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const User = require('./models/User');
const Post = require('./models/Post');

const secret = 'kjfbejajbgfiuwu392rjdvjsdgwrugvisjdnvlhg9r';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// CORS middleware for the API routes
const corsOptions = {
  credentials: true,
  origin: ['http://localhost:3000']
};
router.use(require('cors')(corsOptions));

router.use(express.json());
router.use(require('cookie-parser')());

//for Register
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

//for login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const UserDoc = await User.findOne({ username });
  const passok = bcrypt.compareSync(password, UserDoc.password);
  if (passok) {
    jwt.sign({ username, id: UserDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token).json({
        id: UserDoc._id,
        username,
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

router.post('/post', uploadMiddleware.single('file'), async (req, res) => {
    const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        const newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
      
        const { token } = req.cookies;
        jwt.verify(token, secret, {}, async (err, info) => {
          if (err) throw err;
          const { title, summary, content } = req.body;
      
          try {
            // Upload the image to Cloudinary
            const cloudinaryResponse = await cloudinary.uploader.upload(newPath, {
              folder: 'blog_images', // Specify the folder in Cloudinary where you want to save the image
            });
      
            const PostDoc = await Post.create({
              title,
              summary,
              content,
              cover: cloudinaryResponse.secure_url, // Save the secure URL of the uploaded image
              author: info.id,
            });
      
            res.json(PostDoc.cover);
          } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to upload the image to Cloudinary' });
          }
        });
      });

router.put('/post', uploadMiddleware.single('file'), async (req, res) => {
    let newPath = null;
    if (req.file) {
      const { originalname, path } = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      newPath = path + '.' + ext;
      fs.renameSync(path, newPath);
    }
  
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) throw err;
      const { id, title, summary, content } = req.body;
      const postDoc = await Post.findById(id);
      const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      if (!isAuthor) {
        return res.status(400).json('you are not the author');
      }
  
      try {
        let coverUrl = newPath ? postDoc.cover : postDoc.cover;
        if (newPath) {
          // Upload the updated image to Cloudinary
          const cloudinaryResponse = await cloudinary.uploader.upload(newPath, {
            folder: 'blog_images',
          });
          coverUrl = cloudinaryResponse.secure_url;
        }
  
        await postDoc.updateOne({
          title,
          summary,
          content,
          cover: coverUrl, // Update the secure URL of the image
        });
  
        res.json(postDoc);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload the image to Cloudinary' });
      }
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
  res.json(postDoc);
});

module.exports = router;