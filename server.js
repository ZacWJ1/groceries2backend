const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { ExtractJwt, Strategy: JwtStrategy } = require('passport-jwt');

dotenv.config();

const app = express();
const port = process.env.PORT || 4444;
const UserModel = require('./models/User');

app.use(cors({
  origin: 'https://groceries2-frontend.onrender.com', // Replace with your frontend's URL
  credentials: true,
}));
app.use(express.json());
app.use(passport.initialize());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB', err));

// Configure Passport JWT strategy
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
  UserModel.findById(jwt_payload.id, (err, user) => {
    if (err) {
      return done(err, false);
    }
    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  });
}));

// Signup endpoint
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({ name, email, password: hashedPassword });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
    console.log(savedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log(error.message);
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        const payload = { id: user._id, name: user.name, email: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token: 'Bearer ' + token });
      } else {
        res.status(401).json("Password doesn't match");
      }
    } else {
      res.status(404).json('No Records found');
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected route example
app.get('/user', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ user: req.user });
});

app.listen(port, () => console.log(`Server started on port ${port}`));
