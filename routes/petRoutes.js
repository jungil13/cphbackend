// routes/petRoutes.js

const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const applicationController = require('../controllers/applicationController');
const multer = require('multer');
const { isAuthenticated, auth } = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '-' + file.originalname);
    }
});

const adminMiddleware = auth('Admin');
const upload = multer({ storage: storage });



router.get('/pets',isAuthenticated, petController.getAllPets);
router.get('/approved' , petController.getAllApprovedPets);
router.post('/pets', isAuthenticated, upload.fields([
    { name: 'petPhoto', maxCount: 4 },
    { name: 'vaccinationCertificate', maxCount: 4 }
]), petController.addPet);
router.get('/pets/latest', petController.getLatestPets);
router.get('/pets/:id', petController.getPetDetails);
router.get('/types', petController.getPetTypes);
router.get('/bytypes', petController.getPetsByType);
router.get('/byownerid', isAuthenticated, petController.getPetsByOwnerID);;
router.put('/:id', isAuthenticated, petController.updatePet); 
router.delete('/:id', isAuthenticated, petController.deletePet);


router.post('/pets/:petId/approve', isAuthenticated, adminMiddleware, petController.approvePet);
router.post('/pets/:petId/decline', isAuthenticated, adminMiddleware, petController.declinePet);

router.post('/applications', isAuthenticated, applicationController.submitApplication);
router.get('/applications/owner/:ownerId', isAuthenticated, applicationController.viewOwnerApplications);
router.patch('/applications/:applicationId', isAuthenticated, applicationController.updateApplicationStatus);
router.get('/my-pets/applications', isAuthenticated, applicationController.getMyPetsApplications);

router.get('/applications', isAuthenticated, applicationController.getAllApplications);

module.exports = router;
