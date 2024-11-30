// authRoutes.js
const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    if (req.user && req.user.token) {
      res.redirect(`http://localhost:5173/reports?token=${req.user.token}`);
    } else {
      res.redirect('/login?error=noToken'); 
    }
  }
);

module.exports = router;


