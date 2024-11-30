const express = require('express');
const multer = require('multer');
const reportsController = require('../controllers/reportsController');
const { isAuthenticated } = require('../middleware/auth');
const router = express.Router();
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });


router.post('/reports', isAuthenticated, upload.fields([
    { name: 'photo', maxCount: 4 }
]), reportsController.addReport);
router.get('/reports', reportsController.getAllReports);
router.get('/reports/:id', reportsController.getReportsById);
router.get('/reports/details/:id', reportsController.getReportDetails);
router.get('/my-reports', isAuthenticated, reportsController.getReportsByReporterId);
router.patch('/my-reports/:id', upload.single('Photo'), isAuthenticated, reportsController.updateReport);
router.delete('/reports/:id', isAuthenticated, reportsController.deleteReport);


module.exports = router;
