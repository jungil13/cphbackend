const db = require('./db');
const bcrypt = require('bcryptjs');

exports.getAllUsers = (page = 1, pageSize = 10, searchTerm = '', callback) => {
  // Calculate the offset for pagination
  const offset = (page - 1) * pageSize;

  // SQL query to fetch users with search and pagination
  let query = 'SELECT * FROM users';
  let queryParams = [];

  // If there is a search term, modify the query to filter users
  if (searchTerm) {
    query += ' WHERE Username LIKE ? OR Email LIKE ?';
    queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
  }

  // Add pagination (LIMIT and OFFSET)
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(pageSize, offset);

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching users:", err);
      callback(err, null);
    } else {
      const formattedResults = results.map(user => {
        const formatDate = (date) => {
          if (!date) return null;
          const d = new Date(date);
          if (isNaN(d.getTime())) return null;
          return d.toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
          }).replace(/(\d+)\/(\d+)\/(\d+), (\d+:\d+:\d+)/, '$3-$1-$2 $4');
        };

        return {
          ...user,
          Birthdate: formatDate(user.Birthdate),
          created_at: formatDate(user.created_at),
          updated_at: formatDate(user.updated_at)
        };
      });

      // Get total user count for pagination info
      const countQuery = 'SELECT COUNT(*) AS totalUsers FROM users' + (searchTerm ? ' WHERE Username LIKE ? OR Email LIKE ?' : '');
      const countQueryParams = searchTerm ? [`%${searchTerm}%`, `%${searchTerm}%`] : [];

      db.query(countQuery, countQueryParams, (countErr, countResults) => {
        if (countErr) {
          console.error("Error fetching user count:", countErr);
          callback(countErr, null);
        } else {
          const totalUsers = countResults[0].totalUsers;
          const totalPages = Math.ceil(totalUsers / pageSize);

          callback(null, {
            users: formattedResults,
            totalUsers,
            totalPages,
            currentPage: page
          });
        }
      });
    }
  });
};


exports.createUser = (user, callback) => {

  bcrypt.hash(user.Password, 10, (err, hash) => {
    if (err) {
      console.error("Error hashing password:", err);
      callback(err);
      return;
    }

   
    const query = `
      INSERT INTO users (
        Username, Email, Password, Fullname, 
        Contactnumber, Address, Age, Birthdate, 
        ProfilePhoto, created_at, updated_at, isVerified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), FALSE)
    `;

    
    const profilePhotoPath = user.ProfilePhoto ? user.ProfilePhoto : null;


    db.query(query, [
      user.Username, 
      user.Email, 
      hash, 
      user.Fullname, 
      user.Contactnumber, 
      user.Address, 
      user.Age, 
      user.Birthdate, 
      profilePhotoPath 
    ], (error, results) => {
      if (error) {
        console.error("Error inserting user into the database:", error);
        callback(error);
        return;
      }
  
      callback(null, results.insertId);
    });
  });
};

exports.createVerificationToken = (userId, token, callback) => {
  db.query('UPDATE users SET verificationToken = ? WHERE UserID = ?', [token, userId], (error, results) => {
    if (error) {
      console.error("Error creating verification token:", error);
    }
    callback(error, results);
  });
};

exports.verifyUserEmail = (userId, callback) => {
  db.query('UPDATE users SET isVerified = 1, verificationToken = NULL WHERE UserID = ?', [userId], (error, results) => {
    if (error) {
      console.error("Error verifying user email:", error);
    }
    callback(error, results);
  });
};


exports.findUserByEmail = (email, callback) => {
  console.log("Searching for user with email:", email); 
  db.query('SELECT * FROM users WHERE Email = ?', [email], (err, results) => {
    if (err) {
      console.error("Error finding user by email:", err);
      return callback(err, null);
    }
    console.log("Number of users found:", results.length);
    if (results.length > 0) {
      callback(null, results[0]);
    } else {
      callback(null, null);
    }
  });
};



exports.comparePassword = (candidatePassword, hash, callback) => {
  bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    if (err) {
      console.error("Error comparing passwords:", err);
      return callback(err, false);
    }
    callback(null, isMatch);
  });
};

exports.findUserById = (id, callback) => {
  db.query('SELECT * FROM users WHERE UserID = ?', [id], (err, results) => {
    if (err) {
      console.error('Error finding user by ID:', err);
      return callback(err, null);
    }

    if (results.length === 0) {
      return callback(null, null);
    }

    const user = results[0];

    // Helper function to format dates
    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().replace('T', ' ').slice(0, 19);
    };

    // Format user dates
    const formattedUser = {
      ...user,
      DateJoined: formatDate(user.DateJoined),
      Birthdate: formatDate(user.Birthdate),
      created_at: formatDate(user.created_at),
      updated_at: formatDate(user.updated_at),
    };

    callback(null, formattedUser);
  });
};

exports.updateUser = (userID, updateData, callback) => {
  console.log("Received update data:", updateData);

  let query = 'UPDATE users SET ';
  let updates = [];
  let values = [];

  const allowedUpdates = [
    'Username', 'Email', 'Fullname', 'Age',
    'Contactnumber', 'Address', 'ProfilePhoto', 'UserType', 'isVerified'
  ];

  const hashPasswordAndUpdate = () => {
    if (updateData.Password) {
      bcrypt.hash(updateData.Password, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Password hashing error:", err);
          return callback(err);
        }
        updateData.Password = hashedPassword; 
        processUpdate(); 
      });
    } else {
      processUpdate(); 
    }
  };

  const processUpdate = () => {
    allowedUpdates.forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== '' && updateData[key] !== null) {
        updates.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (updates.length === 0) {
      console.error("Attempt to update with no valid fields.");
      return callback(new Error("No valid fields provided for update"));
    }
    query += updates.join(', ') + ' WHERE UserID = ?';
    values.push(userID);

    console.log("Final SQL Query:", query);
    console.log("Values:", values);

    db.query(query, values, (err, results) => {
      if (err) {
        console.error("SQL Error:", err);
        return callback(err);
      }
      callback(null, results);
    });
  };

  hashPasswordAndUpdate();
};



exports.getUserTypeById = function(userId, callback) {
  const query = 'SELECT UserType FROM users WHERE UserID = ?';
  db.query(query, [userId], function(err, result) {
      if (err) throw err;
      callback(null, result[0].UserType);
  });
};

exports.getUserCount = (callback) => {
  db.query('SELECT COUNT(*) AS count FROM users', (err, results) => {
    if (err) {
      console.error("Error fetching user count:", err);
      callback(err, null);
    } else {
      callback(null, results[0].count);
    }
  });
};


exports.updateUserStatus = (userId, status, callback) => {
  const query = "UPDATE users SET status = ? WHERE UserID = ?";
  db.query(query, [status, userId], (err, result) => {
    if (err) {
      console.error("Error updating user status:", err);
      callback(err, null);
    } else {
      console.log(`Updated status to ${status} for UserID ${userId}, affected rows: ${result.affectedRows}`);
      callback(null, result);
    }
  });
};


exports.saveVerificationToken = (email, token, callback) => {
  const query = `UPDATE users SET verificationToken = ? WHERE Email = ?`;
  db.query(query, [token, email], callback);
};

exports.verifyToken = (token, callback) => {
  const query = `SELECT * FROM users WHERE verificationToken = ?`;
  db.query(query, [token], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return callback(err);
    }
    console.log('Token received:', token);
    console.log('Results from DB:', results);
    
    if (results.length === 0) {
      return callback(null, null);
    }
    callback(null, results[0]); 
  });
};


exports.updateVerificationStatus = (userId, callback) => {
  const query = "UPDATE users SET isVerified = 1 WHERE UserID = ?";
  db.query(query, [userId], callback);
};

exports.create = function(userData, callback) {
  const sql = 'INSERT INTO users (Username, Email, GoogleID, ProfilePhoto, isVerified) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [userData.Username, userData.Email, userData.GoogleID, userData.ProfilePhoto, userData.isVerified], (err, results) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        
        return callback(new Error(`A user with the specified email (${userData.Email}) or Google ID (${userData.GoogleID}) already exists.`));
      }
      return callback(err);
    }
    console.log('Insert result:', results);
    userData.UserID = results.insertId;
    callback(null, userData);
  });
};


exports.findOne = (criteria, callback) => {
  let query = '';
  let params = [];

  if (criteria.GoogleID) {
    query = 'SELECT * FROM users WHERE GoogleID = ?';
    params = [criteria.GoogleID];
  } else if (criteria.id) {
    query = 'SELECT * FROM users WHERE UserID = ?';
    params = [criteria.id];
  } else {
    return callback(new Error('Invalid search criteria'));
  }

  db.query(query, params, (error, results) => {
    if (error) {
      console.error('Error finding user:', error);
      return callback(error);
    }
    if (results.length === 0) {
      console.log('No user found for the given criteria:', criteria);
      return callback(null, null); 
    }
    console.log('Find one result:', results[0]);
    callback(null, results[0]); 
  });
};

