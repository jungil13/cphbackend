const db = require("./db");

class Pet {
  static getLatest(callback) {
    const query = `
      SELECT 
        pets.*, 
        users.Fullname AS ownerFullName, 
        DATE_FORMAT(pets.DateAdded, '%M %d, %Y') AS formattedDateAdded
      FROM pets
      JOIN users ON pets.OwnerID = users.UserID
      WHERE pets.IsApproved = 1
      ORDER BY pets.DateAdded DESC
      LIMIT 4
    `;
    
    console.log("Executing query:", query);
  
    db.query(query, (err, results) => {
      if (err) {
        console.error("Query Error:", err);
        return callback(err, null);
      }
  
      console.log("Query Results:", results);
      callback(null, results);
    });
  }
  
  static updatePetStatus(PetID, status, callback) {
    const query = "UPDATE pets SET Status = ? WHERE PetID = ?";
    console.log(`Executing query: ${query} with values: [${status}, ${PetID}]`); // Log the query
    db.query(query, [status, PetID], (error, results) => {
        if (error) {
            console.error("Error updating pet status:", error); // Log the error
            return callback(error);
        }
        console.log("Pet status updated successfully:", results); // Log success
        callback(null, results);
    });
}


  static getAll(showAll, searchTerm = '', page = 1, pageSize = 5, callback) {
    searchTerm = String(searchTerm).trim();
    const offset = Math.max(0, (page - 1)) * pageSize;

    let query = `
        SELECT pets.*, users.Fullname AS ownerFullName
        FROM pets
        JOIN users ON pets.OwnerID = users.UserID
    `;

    // Apply search condition if `searchTerm` is provided
    let queryParams = [];
    let conditions = [];

    if (searchTerm) {
        conditions.push(`(pets.PetName LIKE ? OR users.Fullname LIKE ?)`);
        queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (!showAll) {
        conditions.push(`pets.IsApproved = TRUE`);
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    // Pagination
    query += ` ORDER BY pets.DateAdded DESC LIMIT ? OFFSET ?`;
    queryParams.push(pageSize, offset);

    db.query(query, queryParams, (err, results) => {
        if (err) return callback(err, null);

        const formatDate = (date) => {
            if (!date) return null;
            const d = new Date(date);
            if (isNaN(d.getTime())) return null;
            return d.toLocaleString("en-US", {
                year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
            }).replace(/(\d+)\/(\d+)\/(\d+), (\d+:\d+:\d+)/, "$3-$1-$2 $4");
        };

        const formattedResults = results.map((pet) => ({
            ...pet,
            Birth: pet.Birth ? formatDate(pet.Birth) : null,
            created_at: formatDate(pet.created_at),
            updated_at: formatDate(pet.updated_at),
            DateAdded: formatDate(pet.DateAdded),
        }));

        // Count query for total pets
        let countQuery = `
            SELECT COUNT(*) AS totalPets
            FROM pets
            JOIN users ON pets.OwnerID = users.UserID
        `;
        if (conditions.length > 0) {
            countQuery += ` WHERE ` + conditions.join(' AND ');
        }

        db.query(countQuery, queryParams.slice(0, -2), (countErr, countResults) => {
            if (countErr) return callback(countErr, null);

            const totalPets = countResults[0].totalPets;
            const totalPages = Math.ceil(totalPets / pageSize);

            callback(null, {
                pets: formattedResults,
                totalPets,
                totalPages,
                currentPage: page
            });
        });
    });
}


static getAllApproved(callback) {
  const query = `
    SELECT 
      pets.*, 
      users.Fullname AS ownerFullName,
      newOwner.Fullname AS newOwnerFullName,
      pets.Birth AS birth,
      pets.DateAdded AS dateAdded
    FROM pets
    JOIN users ON pets.OwnerID = users.UserID
    LEFT JOIN applications ON pets.PetID = applications.PetID AND applications.Status = 'approved'
    LEFT JOIN users AS newOwner ON applications.UserID = newOwner.UserID
    WHERE pets.IsApproved = TRUE
  `;

  db.query(query, (err, results) => {
    if (err) {
      return callback(err, null);
    }

    const formattedResults = results.map((pet) => {
      const birthDate = new Date(pet.birth);
      const dateAdded = new Date(pet.dateAdded);

      const formattedBirth = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(birthDate);

      const formattedDateAdded = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(dateAdded);

      return {
        ...pet,
        Birth: formattedBirth || null,
        DateAdded: formattedDateAdded || null,
        newOwnerFullName: pet.newOwnerFullName // Include the new owner's full name
      };
    });

    callback(null, formattedResults);
  });
}

  // backend/models/Pet.js
  static findPetById(id, callback) {
    const query = `
      SELECT pets.*, 
             users.Fullname AS ownerFullName, 
             users.Email AS ownerEmail,
             newOwner.Fullname AS newOwnerFullName  
      FROM pets
      JOIN users ON pets.OwnerID = users.UserID
      LEFT JOIN applications ON pets.PetID = applications.PetID AND applications.Status = 'approved'
      LEFT JOIN users AS newOwner ON applications.UserID = newOwner.UserID  
      WHERE pets.PetID = ?
    `;
  
    db.query(query, [id], (err, results) => {
      if (err) {
        callback(err, null);
        return;
      }
      if (results.length === 0) {
        callback(null, null);
        return;
      }
  
      const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long', // "long", "short" or "numeric"
          day: '2-digit'
        });
      };
  
      const formattedPet = {
        ...results[0],
        Birth: formatDate(results[0].Birth),
        created_at: formatDate(results[0].created_at),
        updated_at: formatDate(results[0].updated_at),
        DateAdded: formatDate(results[0].DateAdded),
        newOwnerFullName: results[0].newOwnerFullName || 'Not Adopted' // Include new owner's full name
      };
  
      callback(null, formattedPet);
    });
  }

  static add(petData, callback) {
    const query = `
          INSERT INTO pets (OwnerID, Type, PetName, Species, Breed, Markings, Sex, Birth, Description, PetPhoto, VaccinationCertificate, IsApproved)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
        `;
    const values = [
      petData.OwnerID,
      petData.Type,
      petData.PetName,
      petData.Species,
      petData.Breed,
      petData.Markings,
      petData.Sex,
      petData.Birth,
      petData.Description,
      petData.PetPhoto,
      petData.VaccinationCertificate,
    ];
    db.query(query, values, (err, results) => {
      callback(err, results ? results.insertId : null);
    });
  }

  static update(id, petData, callback) {
    db.query(
      "UPDATE pets SET ? WHERE PetID = ?",
      [petData, id],
      (err, results) => {
        callback(err, results);
      }
    );
  }

  static delete(id, callback) {
    db.query("DELETE FROM pets WHERE PetID = ?", id, (err, results) => {
      callback(err, results);
    });
  }

  static getPetTypes() {
    return new Promise((resolve, reject) => {
      db.query("SELECT DISTINCT Type FROM pets WHERE IsApproved = 1", (err, results) => {
        if (err) return reject(err);
        resolve(results.map((row) => row.Type));
      });
    });
  }

  static getPetsByType(type) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT pets.*, users.Fullname AS ownerFullName
        FROM pets
        JOIN users ON pets.OwnerID = users.UserID
        WHERE pets.IsApproved = 1
      `;
      const queryParams = [];
  
      if (type) {
        query += " AND pets.Type = ?";
        queryParams.push(type);
      }
  
      db.query(query, queryParams, (err, results) => {
        if (err) return reject(err);
  
        // Format the Birth and DateAdded fields for each pet
        const formattedResults = results.map(pet => {
          const birthDate = new Date(pet.Birth);
          const dateAdded = new Date(pet.DateAdded);
  
          const formattedBirth = new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          }).format(birthDate);
  
          const formattedDateAdded = new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          }).format(dateAdded);
  
          return {
            ...pet,
            Birth: formattedBirth || null,
            DateAdded: formattedDateAdded || null,
          };
        });
  
        resolve(formattedResults);
      });
    });
  }
  
  static getPetsByOwnerID(ownerId, callback) {
    const query = "SELECT * FROM pets WHERE OwnerID = ?";
    db.query(query, [ownerId], (err, results) => {
      if (err) {
        return callback(err);
      }
      callback(null, results);
    });
  }

  static updatePet(petId, fields, callback) {
    let setClause = "SET ";
    const values = [];
    if (fields.PetName) {
      setClause += "PetName = ?, ";
      values.push(fields.PetName);
    }
    if (fields.Type) {
      setClause += "Type = ?, ";
      values.push(fields.Type);
    }
    if (fields.Breed) {
      setClause += "Breed = ?, ";
      values.push(fields.Breed);
    }
    if (fields.Markings) {
      setClause += "Markings = ?, ";
      values.push(fields.Markings);
    }
    if (fields.Species) {
      setClause += "Species = ?, ";
      values.push(fields.Species);
    }
    if (fields.Sex) {
      setClause += "Sex = ?, ";
      values.push(fields.Sex);
    }
    if (fields.Status) {
      setClause += "Status = ?, ";
      values.push(fields.Status);
    }
    if (fields.Description) {
      setClause += "Description = ?, ";
      values.push(fields.Description);
    }
    if (fields.PetPhoto !== undefined) {
      setClause += "PetPhoto = ?, ";
      values.push(fields.PetPhoto);
    }
    if (fields.VaccinationCertificate) {
      setClause += "VaccinationCertificate = ?, ";
      values.push(fields.VaccinationCertificate);
    }

    if (setClause === "SET ") {
      return callback(null, { message: "No fields to update" });
    }
    setClause = setClause.slice(0, -2);

    const query = `
            UPDATE pets
            ${setClause}
            WHERE PetID = ? AND OwnerID = ?
        `;

    values.push(petId, fields.OwnerID);

    console.log("Update query:", query);
    console.log("Update values:", values);
    db.query(query, values, callback);
  }

  static deletePet(petId, callback) {
    // Check if there are related records in the applications table
    const checkApplicationsQuery = "SELECT COUNT(*) AS count FROM applications WHERE PetID = ?";
    db.query(checkApplicationsQuery, [petId], (err, results) => {
        if (err) {
            return callback({ code: 'DB_ERROR', message: 'Database error occurred while checking applications.' });
        }

        if (results[0].count > 0) {
            return callback({ code: 'FOREIGN_KEY_CONSTRAINT', message: "Cannot delete pet: related applications exist." });
        }

        // Proceed to delete the pet if no related records exist
        const query = "DELETE FROM pets WHERE PetID = ?";
        db.query(query, [petId], (err, results) => {
            if (err) {
                return callback({ code: 'DB_ERROR', message: 'Database error occurred while deleting the pet.' });
            }
            callback(null, results);
        });
    });
}

  static getPetCount = (callback) => {
    db.query("SELECT COUNT(*) AS count FROM pets", (err, results) => {
      if (err) {
        console.error("Error fetching pets count:", err);
        callback(err, null);
      } else {
        callback(null, results[0].count);
      }
    });
  };

  static setApproval(petId, isApproved, callback) {
    const sql = `UPDATE pets SET IsApproved = ? WHERE PetID = ?`;
    db.query(sql, [isApproved, petId], (err, result) => {
        callback(err);
    });
}
  static getApplications(searchTerm = '', page = 1, pageSize = 5, callback) {
    // Ensure searchTerm is a string
    searchTerm = String(searchTerm).trim();

    // Calculate the offset based on the page number and page size
    const offset = (page - 1) * pageSize;
  
    // Base query to select pets and join with users for owner information
    let query = `
      SELECT pets.PetID, pets.Species, pets.Markings, pets.Breed, pets.Sex, pets.Birth, pets.PetPhoto, pets.VaccinationCertificate, pets.PetName, pets.Status, pets.Description, pets.Type, users.UserID, users.Fullname AS OwnerFullName
      FROM pets
      JOIN users ON pets.OwnerID = users.UserID
      WHERE pets.IsApproved = 0 -- 0 means not yet approved
    `;
  
    let queryParams = [];
  
    // Add search conditions if a search term is provided
    if (searchTerm !== '') {
      query += ` AND (pets.PetName LIKE ? OR pets.Breed LIKE ? OR users.Fullname LIKE ?)`;
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
  
    // Add pagination conditions
    query += ` ORDER BY pets.DateAdded LIMIT ? OFFSET ?`;
    queryParams.push(pageSize, offset);
  
    // Execute the query with pagination and search conditions
    db.query(query, queryParams, (err, results) => {
      if (err) return callback(err, null);
      callback(null, results);
    });
}

  static getPaginatedApplications = (limit, offset, callback) => {
    const query = `
        SELECT p.PetID, p.PetName, p.Status, u.UserID, u.Fullname AS OwnerFullName
        FROM pets AS p
        JOIN users AS u ON p.OwnerID = u.UserID
        ORDER BY p.DateAdded DESC
        LIMIT ?, ?;
    `;
    db.query(
      query,
      [parseInt(offset, 10), parseInt(limit, 10)],
      (err, results) => {
        if (err) {
          callback(err, null, null);
          return;
        }

        const countQuery = "SELECT COUNT(*) AS total FROM pets";
        db.query(countQuery, (errCount, resultsCount) => {
          if (errCount) {
            callback(errCount, null, null);
            return;
          }
          const total = resultsCount[0].total;
          callback(null, results, total);
        });
      }
    );
  };

  static updatePetDetails = (petId, petDetails, callback) => {
    const {
      type,
      name,
      species,
      breed,
      markings,
      sex,
      birth,
      description,
      status,
    } = petDetails;
    const query = `UPDATE pets SET Type=?, PetName=?, Species=?, Breed=?, Markings=?, Sex=?, Birth=?, Description=?, Status=? WHERE PetID=?`;
    db.query(
      query,
      [
        type,
        name,
        species,
        breed,
        markings,
        sex,
        birth,
        description,
        status,
        petId,
      ],
      (err, results) => {
        if (err) {
          return callback(err, null);
        }
        callback(null, results);
      }
    );
  };
}

module.exports = Pet;
