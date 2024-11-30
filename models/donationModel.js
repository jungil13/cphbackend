const path = require('path');
const fs = require('fs');

class DonationModel {
    // Path to the saved image
    static getImagePath() {
        return path.join(__dirname, '../uploads/current_gcash_image.jpg');
    }

    // Check if the image exists
    static imageExists() {
        return fs.existsSync(this.getImagePath());
    }

    // Save the uploaded image
    static saveImage(filePath) {
        const currentImagePath = this.getImagePath();
        fs.renameSync(filePath, currentImagePath); // Move the uploaded file to the desired location
    }
}

module.exports = DonationModel;
