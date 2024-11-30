
const express = require('express');
const router = express.Router();

router.get('/users', (_req, res) => {
    res.send('Welcome to the API');
});

module.exports = router;
