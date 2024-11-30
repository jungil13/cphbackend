const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { isAuthenticated } = require('../middleware/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

router.get('/verify-email',usersController.verifyEmail);
router.post('/request-verification', usersController.requestVerification);


router.get('/', usersController.getUsers);
router.post('/login', usersController.loginUser);
router.post('/register', upload.single('ProfilePhoto'), usersController.registerUser);
router.get('/api/login', (req, res) => {
  res.redirect('http://localhost:5173/login');
});


router.post('/logout', isAuthenticated, usersController.logoutUser);
router.get('/user', isAuthenticated, usersController.getUserDetails);
router.get('/:id', isAuthenticated, usersController.getUserById);
router.put('/:id', isAuthenticated, upload.single('ProfilePhoto'), usersController.updateUser);



module.exports = router;
