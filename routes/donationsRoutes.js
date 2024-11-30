const express = require('express');
const multer = require('multer');
const DonationController = require('../controllers/donationController');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, 'temp_gcash_image.jpg'); // Temporary file name before moving
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed.'));
        }
        cb(null, true);
    }
});

// Route to upload the GCash image
router.post('/upload-image', upload.single('image'), DonationController.uploadImage);

// Route to get the current GCash image
router.get('/get-image', DonationController.getImage);

module.exports = router;
