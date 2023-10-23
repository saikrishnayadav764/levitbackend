const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const port = process.env.PORT || 3000;
const fs = require('fs')

const app = express();



// Define the MongoDB schema for users
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});





const submissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    al1: String,
    al2: String,
    city: String,
    state: String,
    pincode: String,
    country: String,
  },
  selectedOptions: [String], // An array of strings
  geolocationStatus: String,
  files: [String],
  submitDate: {
    type: Date,
    default: Date.now,
  }
});


const User = mongoose.model('User', userSchema);
const Submission = mongoose.model('submissions', submissionSchema);

const dbURL = 'mongodb+srv://naruto:naruto@cluster0.be644zi.mongodb.net/db?retryWrites=true&w=majority'; // Change this to your MongoDB URL
mongoose.connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true });
const connection = mongoose.connection;

connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

connection.once('open', () => {
  console.log('Connected to MongoDB');
});


const secretKey = 'your_secret_key';

app.use(bodyParser.json());
app.use(cors());



app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const token = jwt.sign({ email: user.email }, secretKey, {
      expiresIn: '1h',
    });

    res.status(200).json({ message: 'Authentication successful', token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});


const fileFilter = (req, file, cb) => {
  const allowedFileTypes = [ 'image/png', 'application/pdf'];
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported'), false);
  }
};


const upload = multer({ storage, fileFilter });

const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));


app.post('/upload', upload.array('files'), (req, res) => {
  res.status(200).json();
});



app.post('/submit', async (req, res) => {
  try {
    const submissionData = req.body;
    const newSubmission = new Submission(submissionData);
    await newSubmission.save();

    res.status(200).json();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/submissions', async (req, res) => {
  try {
    const submissions = await Submission.find();
    res.status(200).json({ submissions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.get('/filenames', (req, res) => {
  // Read the contents of the uploads folder
  fs.readdir(uploadsPath, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    } else {
      // Filter out any non-file items (directories, etc.)
      const filenames = files.filter((file) => {
        return fs.statSync(path.join(uploadsPath, file)).isFile();
      });
      res.status(200).json({ filenames });
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log('Server is running on port 3000');
});
