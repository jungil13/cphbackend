const UserModel = require("../models/user");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require('bcrypt');
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}
exports.getUsers = (req, res) => {
  UserModel.getAllUsers((err, data) => {
    if (err) {
      return res.status(500).json({ msg: "Failed to retrieve users", error: err });
    }
    res.json(data);
  });
};

exports.loginUser = (req, res) => {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }

  // Find user by email
  UserModel.findUserByEmail(Email, (err, user) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ msg: "Internal server error" });
    }

    if (!user) {
      console.error("User not found with email:", Email);
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    // Compare password
    UserModel.comparePassword(Password, user.Password, (err, isMatch) => {
      if (err) {
        console.error("Error checking password:", err);
        return res.status(500).json({ msg: "Internal server error" });
      }

      if (isMatch) {
        console.log("User authenticated successfully:", user.Username);

        // Update user status to active
        UserModel.updateUserStatus(user.UserID, 'Active', (err, updateResult) => {
          if (err) {
            console.error("Failed to update user status:", err);
            return res.status(500).json({ msg: "Failed to update user status" });
          }

        
          const payload = {
            id: user.UserID,
            username: user.Username,
            userType: user.UserType,
            isVerified: user.isVerified  
          };

          const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "10y" });

          
          res.json({
            msg: "Logged in successfully",
            token,
            username: user.Username,
            userType: user.UserType,
            user: {
              id: user.UserID,
            },
            status: 'Active',
            isVerified: user.isVerified  
          });
        });
      } else {
        console.error("Password mismatch for user:", Email);
        res.status(401).json({ msg: "Invalid credentials" });
      }
    });
  });
};



exports.getUserDetails = (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("Token verification failed:", err);
      return res.status(401).json({ message: "Invalid or expired token", error: err.message });
    }

    UserModel.findUserById(decoded.id, (err, user) => {
      if (err) {
        return res.status(500).json({ message: "Error fetching user data", error: err });
      }
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { Password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    });
  });
};

exports.logoutUser = (req, res) => {
  const userId = req.user.id; 

  console.log("Logging out user with ID:", userId);

  UserModel.updateUserStatus(userId, 'Offline', (err, result) => {
    if (err) {
      console.error("Error updating user status on logout:", err);
      return res.status(500).json({ msg: "Failed to log out user", error: err.message });
    }

    console.log("User status updated to Offline for UserID:", userId); 

    
    res.json({ msg: "User logged out successfully" });
  });
};


exports.getUserById = (req, res) => {
  const { id } = req.params;
  UserModel.findUserById(id, (err, user) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error", error: err });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  });
};

exports.updateUser = (req, res) => {
  const userId = req.params.id;
  const updatedData = { ...req.body };
  if (req.file) {
    updatedData.ProfilePhoto = req.file.path;
  } else if (updatedData.ProfilePhoto === '') {
    delete updatedData.ProfilePhoto;
  }
  UserModel.findUserById(userId, (err, user) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res.status(500).json({ message: "Internal server error", error: err });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (req.user.id !== user.UserID) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (updatedData.Password) {
      bcrypt.hash(updatedData.Password, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
          console.error("Error hashing new password:", hashErr);
          return res.status(500).json({ message: "Failed to update password", error: hashErr });
        }
        updatedData.Password = hashedPassword; 
        proceedWithUpdate();
      });
    } else {
      proceedWithUpdate();
    }

    function proceedWithUpdate() {
      delete updatedData.isVerified;
      delete updatedData.verificationToken;
      delete updatedData.confirmPassword;

      UserModel.updateUser(userId, updatedData, (updateErr, updateResults) => {
        if (updateErr) {
          console.error("Error updating user:", updateErr);
          return res.status(500).json({ message: "Error updating user", error: updateErr });
        }
        res.json({ message: "User updated successfully", user: updateResults });
      });
    }
  });
};



exports.registerUser = (req, res) => {
  const {
    Username,
    Email,
    Password,
    Fullname,
    Contactnumber,
    Address,
    Age,
    Birthdate,
  } = req.body;
  const ProfilePhoto = req.file ? req.file.path : null;

  if (
    !Username ||
    !Email ||
    !Password ||
    !Fullname ||
    !Contactnumber ||
    !Address ||
    !Age ||
    !Birthdate
  ) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  UserModel.createUser(
    {
      Username,
      Email,
      Password,
      Fullname,
      Contactnumber,
      Address,
      Age,
      Birthdate,
      ProfilePhoto,
    },
    (err, userId) => {
      if (err) {
        return res.status(500).json({ msg: "Error registering user", error: err });
      }

      const token = crypto.randomBytes(32).toString('hex'); 
      UserModel.createVerificationToken(userId, token, (error) => {
        if (error) {
          return res.status(500).json({ msg: "Failed to create verification token", error });
        }
        sendVerificationEmail({ UserID: userId, Email, token }); 
        res.status(201).json({ msg: "User registered and verification email sent", userId });
      });
    }
  );
};

exports.verifyEmail = (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("Token verification failed:", err);
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    UserModel.updateVerificationStatus(decoded.id, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error updating verification status.' });
      }
      res.json({ message: 'Email verified successfully!', status: 'Email verified successfully!' });
    });
  });
};

exports.sendVerificationEmail = async (req, res) => {
    try {
        const userId = req.user.id; 

        UserModel.findUserById(userId, (err, user) => {
            if (err) {
                return res.status(500).json({ message: "Server error", error: err.message });
            }
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

           
            sendVerificationEmail(user);
            res.status(200).json({ message: "Verification email sent" });
        });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

  
    const sendVerificationEmail = async (user) => {
    try {
      const token = jwt.sign({ id: user.UserID }, process.env.JWT_SECRET, { expiresIn: '24h' });
        const verificationLink = `http://localhost:3000/api/users/verify-email?id=${user.UserID}&token=${token}`;

        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.Email,
            subject: "Email Verification",
            html: `Please verify your email by clicking <a href="${verificationLink}">here</a>.`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.response);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error('Error sending verification email');
    }
};

exports.requestVerification = async (req, res) => {
  const { Email } = req.body;
  if (!Email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }

  try {
    const user = await new Promise((resolve, reject) => {
      UserModel.findUserByEmail(Email, (err, user) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      });
    });

    if (!user) {
      console.log("No user found with email:", Email);  // Log this for debugging
      return res.status(404).json({ message: "User not found" });
    }

    await sendVerificationEmail(user);
    res.status(200).json({ message: "Verification email sent successfully." });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
