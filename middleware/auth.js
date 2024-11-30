const jwt = require('jsonwebtoken');
const { getUserTypeById } = require('../models/user');

exports.isAuthenticated = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (ex) {
        console.error('JWT Verification Error:', ex);
        switch (ex.name) {
            case 'TokenExpiredError':
                return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
            case 'JsonWebTokenError':
                return res.status(400).json({ error: 'Invalid token.' });
            default:
                return res.status(400).json({ error: 'Authentication failed.' });
        }
    }
};

exports.auth = function(requiredType) {
    return function(req, res, next) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).send('Access Denied: No token provided!');
        
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return res.status(400).send('Invalid token.');
            
            req.user = decoded;
            getUserTypeById(decoded.id, (err, userType) => {
                if (err) return res.status(500).send('Internal Server Error');
                if (userType !== requiredType) return res.status(403).send('Access Denied: You do not have permission to view this resource');
                
                next();
            });
        });
    };
};