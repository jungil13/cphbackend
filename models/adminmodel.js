const db = require('../models/db'); // Adjust path as needed
const bcrypt = require('bcrypt');

class AdminModel {
  // Fetch all users with optional search
  static fetchUsers(searchQuery = '', callback) {
    let query = 'SELECT * FROM users';
    const values = [];

    if (searchQuery) {
      query += ' WHERE Username LIKE ? OR Email LIKE ?';
      values.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    db.query(query, values, (err, results) => {
      if (err) return callback(err);
      callback(null, results);
    });
  }

  // Create a new user
  static createUser(userData, callback) {
    bcrypt.hash(userData.Password, 10, (err, hash) => {
      if (err) return callback(err);

      const query = `
        INSERT INTO users (Username, Email, Password, Fullname, Contactnumber, Address, Age, Birthdate, UserType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        userData.Username,
        userData.Email,
        hash,
        userData.Fullname,
        userData.Contactnumber,
        userData.Address,
        userData.Age,
        userData.Birthdate,
        userData.UserType,
      ];

      db.query(query, values, (err, results) => {
        if (err) return callback(err);
        callback(null, results.insertId);
      });
    });
  }

// Update an existing user
static updateUser(userId, updateData, isAdmin, callback) {
  let query = 'UPDATE users SET ';
  const updates = [];
  const values = [];

  const allowedUpdates = ['Username', 'Email', 'Fullname', 'Contactnumber', 
                          'Address', 'Age', 'Birthdate', 'UserType', 'isVerified'];

  // Collect valid fields for the update
  allowedUpdates.forEach((key) => {
    if (updateData[key] !== undefined && updateData[key] !== '') {
      updates.push(`${key} = ?`);
      values.push(updateData[key]);
    }
  });

  // Handle password separately
  const handlePassword = (cb) => {
    if (updateData.Password) {
      bcrypt.hash(updateData.Password, 10, (err, hash) => {
        if (err) return cb(err);
        updates.push('Password = ?');
        values.push(hash);
        cb(null);
      });
    } else {
      cb(null);
    }
  };

  handlePassword((err) => {
    if (err) return callback(err);

    // Ensure at least one valid field is updated
    if (updates.length === 0) {
      return callback(new Error('No valid fields provided for update'));
    }

    query += updates.join(', ') + ' WHERE UserID = ?';
    values.push(userId);

    // Execute the SQL query
    db.query(query, values, (err, results) => {
      if (err) return callback(err);
      callback(null, results);
    });
  });
}
  // // Delete a user
  // static deleteUser(userId, callback) {
  //   const query = 'DELETE FROM users WHERE UserID = ?';
  //   db.query(query, [userId], (err, results) => {
  //     if (err) return callback(err);
  //     callback(null, results);
  //   });
  // }

  static updatePet(petId, fields, callback) {
    let setClause = "SET ";
    const values = [];
    let isUpdateNeeded = false; // Track if there are updates
  
    // Append fields to update
    if (fields.PetName) {
      setClause += "PetName = ?, ";
      values.push(fields.PetName);
      isUpdateNeeded = true;
    }
    if (fields.Type) {
      setClause += "Type = ?, ";
      values.push(fields.Type);
      isUpdateNeeded = true;
    }
    if (fields.Breed) {
      setClause += "Breed = ?, ";
      values.push(fields.Breed);
      isUpdateNeeded = true;
    }
    if (fields.Markings) {
      setClause += "Markings = ?, ";
      values.push(fields.Markings);
      isUpdateNeeded = true;
    }
    if (fields.Species) {
      setClause += "Species = ?, ";
      values.push(fields.Species);
      isUpdateNeeded = true;
    }
    if (fields.Sex) {
      setClause += "Sex = ?, ";
      values.push(fields.Sex);
      isUpdateNeeded = true;
    }
    if (fields.Status) {
      setClause += "Status = ?, ";
      values.push(fields.Status);
      isUpdateNeeded = true;
    }
    if (fields.Description) {
      setClause += "Description = ?, ";
      values.push(fields.Description);
      isUpdateNeeded = true;
    }
    if (fields.PetPhoto !== undefined) {
      setClause += "PetPhoto = ?, ";
      values.push(JSON.stringify(fields.PetPhoto)); // Stringify if it's an array
      isUpdateNeeded = true;
    }
    if (fields.VaccinationCertificate !== undefined) {
      setClause += "VaccinationCertificate = ?, ";
      values.push(JSON.stringify(fields.VaccinationCertificate)); // Stringify if it's an array
      isUpdateNeeded = true;
    }
  
    if (!isUpdateNeeded) {
      return callback(null, { message: "No fields to update" });
    }
    
    // Remove the last comma and space
    setClause = setClause.slice(0, -2);
  
    const query = `
      UPDATE pets
      ${setClause}
      WHERE PetID = ? AND OwnerID = ?
    `;
  
    values.push(petId, fields.OwnerID); // Ensure OwnerID is included
  
    console.log("Update query:", query);
    console.log("Update values:", values);
    db.query(query, values, (err, result) => {
      if (err) {
        console.error("SQL Error:", err);
        return callback(err);
      }
      callback(null, result);
    });
  }  

  static updateReport(ReportID, fields, callback) {
    let setClause = "SET ";
    const values = [];

    // Dynamically add fields to the update query
    if (fields.ReportType) {
        setClause += "ReportType = ?, ";
        values.push(fields.ReportType);
    }
    if (fields.Description) {
        setClause += "Description = ?, ";
        values.push(fields.Description);
    }
    if (fields.Location) {
        setClause += "Location = ?, ";
        values.push(fields.Location);
    }
    if (fields.Status) {
        setClause += "Status = ?, ";
        values.push(fields.Status);
    }
    if (fields.Photo !== undefined) {
        setClause += "Photo = ?, ";
        values.push(fields.Photo);
    }

    // Remove trailing comma
    setClause = setClause.slice(0, -2);

    // Final query with conditional updates
    const query = `
        UPDATE lost_found_reports
        ${setClause}
        WHERE ReportID = ? 
        AND (ReporterID = ? OR ? = 'Admin')  -- Allow update if user is the report owner or Admin
    `;

    values.push(ReportID, fields.ReporterID, 'Admin');  // Check if the user is an Admin

    console.log("Update query:", query);
    console.log("Update values:", values);

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Database update error:", err);
            return callback(err);
        }
        callback(null, result);
    });
}


static getReportsById(reportId) {
  return new Promise((resolve, reject) => {
      const query = `
          SELECT lost_found_reports.*, users.FullName AS reporterFullName
          FROM lost_found_reports
          JOIN users ON lost_found_reports.ReporterID = users.UserID
          WHERE lost_found_reports.ReportID = ?
      `;
      db.query(query, [reportId], (err, results) => {
          if (err) return reject(err);
          if (results.length === 0) return resolve(null);

          const report = results[0];
          const dateReported = new Date(report.DateReported);
          const formattedDate = new Intl.DateTimeFormat('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              hour12: true
          }).format(dateReported);

          // Return the formatted report
          resolve({
              ...report,
              DateReported: formattedDate
          });
      });
  });
}

  

}


module.exports = AdminModel;
