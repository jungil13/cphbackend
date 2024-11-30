const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

router.patch('/applications/:applicationId/status', applicationController.updateApplicationStatus);
router.delete('/applications/:applicationId', applicationController.deleteApplication);

module.exports = router;
