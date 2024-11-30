const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const jwt = require('jsonwebtoken');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/api/users/auth/google/callback',
  passReqToCallback: true
},
(req, accessToken, refreshToken, profile, done) => {
  User.findOne({ GoogleID: profile.id }, (err, user) => {
    if (err) {
      return done(err);
    }
    if (user) {
      const token = jwt.sign({ id: user.UserID }, 'your_secret_key', { expiresIn: '1d' });
      user.token = token;
      return done(null, user);
    }
    User.create({
      GoogleID: profile.id,
      Username: profile.displayName,
      Email: profile.emails[0].value,
      ProfilePhoto: profile.photos[0].value,
      isVerified: true
    }, (err, newUser) => {
      if (err) {
        return done(err);
      }
      const token = jwt.sign({ id: newUser.UserID }, 'your_secret_key', { expiresIn: '1d' });
      newUser.token = token; 
      return done(null, newUser);
    });
  });
}));


passport.serializeUser((user, done) => {
  console.log('Attempting to serialize user:', user);
  done(null, user.UserID);  
});

passport.deserializeUser((id, done) => {
  console.log('Deserializing user ID:', id);
  User.findOne({ UserID: id }, (err, user) => { 
    if (err) {
      console.error('Error during deserialization:', err);
      return done(err);
    }
    if (!user) {
      console.error('User not found with ID:', id);
      return done(new Error('User not found'));
    }
    done(null, user);
  });
});
