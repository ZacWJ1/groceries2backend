
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require("dotenv");
/*require('dotenv').config();*/
const bcrypt = require("bcrypt");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const UserModel = require("./models/User");
const passport = require('passport')
const cookieParser = require("cookie-parser");
// Passport config
require('./config/passport')(passport)
//auth code

const flash = require('express-flash')
const logger = require('morgan')

const app = express();

const corsOptions = {
  origin: 'https://groceries2-frontend.onrender.com', 
  credentials: true,
  
  //allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions))
app.options('https://groceries2-frontend.onrender.com', cors(corsOptions));

  
dotenv.config();

const port=process.env.PORT || 4444

app.use(express.json());


app.use(cookieParser());
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));


app.set("trust proxy",1)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI
  }),
  cookie: { maxAge: 24 * 60 * 60 * 1000, sameSite:'none',secure:true } // 1 day
  
   
}));
/*app.get('/', (req, res) => {
    res.send('Welcome to the Express Server!');
  });*/
app.post("/signup", async (req, res) => {
  try {
      const { name, email, password } = req.body;
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ error: "Email already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new UserModel({ name, email, password: hashedPassword });
      const savedUser = await newUser.save();
      res.status(201).json(savedUser);
      console.log(savedUser)
  } catch (error) {
      res.status(500).json({ error: error.message });
      console.log(error.message)
  }
});

app.post("/login", async (req, res) => {
  try {
      const { email, password } = req.body;
      const user = await UserModel.findOne({ email });
      if (user) {
          const passwordMatch = await bcrypt.compare(password, user.password);
          if (passwordMatch) {
              req.session.user = { id: user._id, name: user.name, email: user.email };
              // console.log(email);
               req.session.save((err) => {
                  if (err) {
                      console.error("Session save error:", err);
                      return res.status(500).json({ error: "Failed to save session" });
                  }
                  
                  console.log("Session set:", req.session.user);
                  res.json("Success");
              });
          }
              else {
              res.status(401).json("Password doesn't match");
          }
      } else {
          res.status(404).json("No Records found");
      }
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});


app.post("/logout", (req, res) => {
  if (req.session) {
      req.session.destroy(err => {
          if (err) {
              res.status(500).json({ error: "Failed to logout" });
          } else {
              res.status(200).json("Logout successful");
          }
      });
  } else {
      res.status(400).json({ error: "No session found" });
  }
});

app.get('/user', (req, res) => {
    console.log('Session data:', req.session);
  if (req.session.user) {
    console.log("Authenticated user:", req.session.user);
    
      res.json({ user: req.session.user });
  } else {
    console.log("User not authenticated");
      res.status(401).json("Not authenticated");
  }
});
//auth code
app.use(express.urlencoded({ extended: true }))
app.use(logger('dev'))
  // Passport middleware
app.use(passport.initialize())
app.use(passport.session())

app.use(flash())
//auth code*/



    const itemSchema = new mongoose.Schema({
      userID:{
        type: String,
        required:true,
      },
      item: String,
      protein: String,
      fat: String,
      carbs: String,
      image: String,
      note: String,
  });
  
  const grocerySchema = new mongoose.Schema({
    userID:{
      type:String,
      required:true,
    },
    grocery: String,
    cost: String,
    type: String,
    expiration: String
    
});
  const Item = mongoose.model('Item', itemSchema);
  const Grocery = mongoose.model('Grocery', grocerySchema);
  
  app.get('/items', async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
  }
      const userId = req.session.user.id;
      const items = await Item.find({userID:userId});
      res.send(items);
  });

  app.get('/groceries', async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
  }
    const userId = req.session.user.id;// Get the user ID from the session
    const groceries = await Grocery.find({userID:userId});// Filter by userID 
    res.send(groceries);
});
  
  app.get('/items/:id', async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
  }
      const userId = req.session.user.id;
      try {
        const food = await Item.findOne({ _id: req.params.id, userID: userId });
        if (!food) {
            return res.status(404).json({ error: "Item not found or not authorized" });
        }
        res.send(food);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/groceries/:id', async (req, res) => {
  if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
  }
  const userId = req.session.user.id;
  try {
      const groceryItem = await Grocery.findOne({ _id: req.params.id, userID: userId });
      if (!groceryItem) {
          return res.status(404).json({ error: "Grocery not found or not authorized" });
      }
      res.send(groceryItem);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});
  
  app.post('/items', async (req, res) => {
    if(!req.session.user){
      return res.status(401).json({error: "Not Authenticated"});
    }
      const userId=req.session.user.id;

      const newItem = new Item({
        ...req.body,
        userID:userId, //Add the userID
      });
      const savedItem = await newItem.save();
      res.send(savedItem);
  });

  app.post('/groceries', async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
  }
    const userId = req.session.user.id; // Get the user ID from the session
    const newGrocery = new Grocery({
      ...req.body,
    userID: userId,//Add the userID
  });
    const savedGrocery = await newGrocery.save();
    res.send(savedGrocery);
});
  
  app.delete('/items/:id', async (req, res) => {
      await Item.findByIdAndDelete(req.params.id);
      res.status(200).send('Item deleted');
  });
  app.delete('/groceries/:id', async (req, res) => {
    await Grocery.findByIdAndDelete(req.params.id);
    res.status(200).send('Grocery deleted');
});
  
  app.listen(port, () => console.log(`Server started on port ${port}`));