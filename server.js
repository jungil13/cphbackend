require('dotenv').config();
const express = require('express');
const cors = require('cors');
const users = require('./routes/users');
const petRoutes = require('./routes/petRoutes');
const path = require('path');
const reportRoutes = require('./routes/reportRoutes');
const forumRoutes = require('./routes/forumRoutes');
const adminRoutes = require('./routes/adminRoutes');
const applications = require('./routes/applications');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
require('./config/passport-setup'); 
const authRoutes = require('./routes/authRoutes');
const http = require('http');
const socketIo = require('socket.io');
const donationsRoutes = require('./routes/donationsRoutes')



const app = express(); // Initialize `app` first
const server = http.createServer(app); // Pass `app` to createServer
const io = socketIo(server, {
  cors: {
    origin:  ['http://localhost:5173', 'http://192.168.67.185:5173'],  // Allowing socket connections from Vue app's origin
    methods: ['GET', 'POST'],
    credentials: true,
  },
});


// Set up Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected');

  // Add room joining for user-specific notifications
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their notification room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});


// Function to emit notifications
function sendNotification(userId, data) {
  io.to(`user_${userId}`).emit('notification', data);
}

// Authenticated notification route
app.post('/api/notify', (req, res) => {
  const notificationData = req.body;
  sendNotification(notificationData); // Send the notification
  res.status(200).send({ message: 'Notification sent' });
});

const PORT = process.env.PORT || 3000;

// CORS options for allowing specific origins
const corsOptions = {
  origin: ['https://cph-front.vercel.app', 'http://localhost:5173', 'http://192.168.67.185:5173'], 
  optionsSuccessStatus: 200 
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

// Contact form route
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS,  
    },
  });

  const mailOptions = {
    from: email,
    to: process.env.EMAIL_USER, 
    subject: `👋 Cordova Pet Hub Contact form, from ${name}`,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ msg: 'Message sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ msg: 'Failed to send message. Please try again.' });
  }
});

// Routes
app.use('/api/users', users); 
app.use('/api', reportRoutes);
app.use('/api/pets', petRoutes);
app.use('/api', petRoutes);
app.use('/admin', adminRoutes); 
app.use('/api/forum', forumRoutes);
app.use('/api', applications); 
app.use('/api/users', authRoutes);
app.use('/api', authRoutes);
app.use('/api/donations', donationsRoutes);

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
