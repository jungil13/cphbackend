const DonationModel = require('../models/donationModel');

class DonationController {
    // Upload the GCash image
    static async uploadImage(req, res) {
        if (!req.file) {
            return res.status(400).json({ message: 'No image uploaded.' });
        }

        try {
            DonationModel.saveImage(req.file.path); // Save the uploaded image
            res.json({ filePath: `http://localhost:3000/current_gcash_image.jpg` });
        } catch (error) {
            console.error('Error saving image:', error);
            res.status(500).json({ message: 'Error saving image.' });
        }
    }

    // Get the GCash image
    static async getImage(req, res) {
        try {
            if (DonationModel.imageExists()) {
                res.json({ filePath: `http://localhost:3000/current_gcash_image.jpg` });
            } else {
                res.status(404).json({ message: 'Image not found.' });
            }
        } catch (error) {
            console.error('Error fetching image:', error);
            res.status(500).json({ message: 'Error fetching image.' });
        }
    }
}

module.exports = DonationController;
