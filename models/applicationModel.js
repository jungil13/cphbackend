const db = require('../models/db');

exports.createApplication = (applicationData, callback) => {
    const { UserID, PetID, PetExperience, HomeEnvironment, OtherPets, ChildrenAtHome, ReasonForAdoption } = applicationData;
    const query = `
        INSERT INTO applications (UserID, PetID, PetExperience, HomeEnvironment, OtherPets, ChildrenAtHome, ReasonForAdoption)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(query, [UserID, PetID, PetExperience, HomeEnvironment, OtherPets, ChildrenAtHome, ReasonForAdoption], callback);
};

exports.findByOwnerId = (ownerId, callback) => {
    const query = `
        SELECT a.*, p.PetName, p.PetPhoto,
               u.FullName AS ApplicantName, u.Email, u.Contactnumber, u.Address, u.ProfilePhoto
        FROM applications a
        JOIN pets p ON a.PetID = p.PetID
        JOIN users u ON a.UserID = u.UserID
        WHERE p.OwnerID = ?
    `;
    db.query(query, [ownerId], callback);
};

exports.updateStatus = (applicationId, status, callback) => {
    const query = "UPDATE applications SET Status = ? WHERE ApplicationID = ?";
    db.query(query, [status, applicationId], callback);
};

exports.getApplicationsByOwnerId = (ownerId, callback) => {
    const query = `
        SELECT 
            a.ApplicationID,
            a.UserID,
            a.PetID,
            a.PetExperience,
            a.HomeEnvironment,
            a.OtherPets,
            a.ChildrenAtHome,
            a.ReasonForAdoption,
            a.Status,
            a.DateSubmitted,
            p.PetName,
            p.PetPhoto,
            u.FullName AS ApplicantName,
            u.Email AS ApplicantEmail,
            u.Address AS ApplicantAddress,
            u.Contactnumber AS ApplicantContactnumber,
            u.ProfilePhoto AS ApplicantProfilePhoto
        FROM applications a
        JOIN pets p ON a.PetID = p.PetID
        JOIN users u ON a.UserID = u.UserID
        WHERE p.OwnerID = ?
    `;
    db.query(query, [ownerId], callback);
};

exports.getAllApplications = (page, perPage, searchQuery = '', callback) => {
    // Calculate OFFSET for pagination
    const offset = (page - 1) * perPage;

    // Base query to get the count of applications matching the search query
    let countQuery = `
        SELECT COUNT(*) AS totalCount
        FROM applications a
        JOIN users u ON a.UserID = u.UserID
        JOIN pets p ON a.PetID = p.PetID
    `;

    // Add search query condition for the count query
    const searchParams = [];
    if (searchQuery) {
        countQuery += `
            WHERE p.PetName LIKE ? 
            OR u.FullName LIKE ?
        `;
        searchParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    // Execute the count query to get the total number of applications
    db.query(countQuery, searchParams, (err, countResults) => {
        if (err) {
            return callback(err, null);
        }

        // Get the total number of applications
        const totalCount = countResults[0].totalCount;

        // Build the main query to get the applications for the current page
        let query = `
            SELECT 
                a.ApplicationID,
                a.UserID,
                a.PetID,
                a.PetExperience,
                a.HomeEnvironment,
                a.OtherPets,
                a.ChildrenAtHome,
                a.ReasonForAdoption,
                a.Status,
                a.DateSubmitted,
                p.PetName,
                p.PetPhoto,
                u.FullName AS ApplicantName,
                u.Email AS ApplicantEmail,
                u.Address AS ApplicantAddress,
                u.ContactNumber AS ApplicantContactnumber,
                u.ProfilePhoto AS ApplicantProfilePhoto
            FROM applications a
            JOIN users u ON a.UserID = u.UserID
            JOIN pets p ON a.PetID = p.PetID
        `;

        // Add search query condition
        if (searchQuery) {
            query += `
                WHERE p.PetName LIKE ? 
                OR u.FullName LIKE ?
            `;
        }

        // Add pagination (LIMIT and OFFSET)
        query += ` ORDER BY a.DateSubmitted DESC LIMIT ? OFFSET ?`;

        // Execute the main query with pagination
        const queryParams = [...searchParams, perPage, offset];
        db.query(query, queryParams, (err, results) => {
            if (err) {
                return callback(err, null);
            }

            // Modify results to parse PetPhoto properly
            const modifiedResults = results.map(result => {
                if (result.PetPhoto) {
                    try {
                        result.PetPhoto = JSON.parse(result.PetPhoto.replace(/\\\\/g, "/"));
                    } catch (e) {
                        console.error('Failed to parse PetPhoto:', e);
                    }
                }
                return result;
            });

            // Return the applications and totalCount
            callback(null, {
                applications: modifiedResults,
                totalCount: totalCount,
            });
        });
    });
};


exports.getApplicationDetails = (applicationId, callback) => {
    const query = `
        SELECT 
            u.Email as userEmail, 
            u.FullName as userName, 
            p.PetID as PetID,  -- Removed inline comment
            p.PetName as petName,
            owner.Email as ownerEmail,
            owner.Contactnumber as ownerContactNumber,
            owner.Address as ownerAddress
        FROM applications a
        JOIN users u ON a.UserID = u.UserID
        JOIN pets p ON a.PetID = p.PetID
        JOIN users owner ON p.OwnerID = owner.UserID
        WHERE a.ApplicationID = ?
    `;
    db.query(query, [applicationId], (err, results) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, results[0]); 
        }
    });
};
exports.deleteApplication = (applicationId, callback) => {
    const query = "DELETE FROM applications WHERE ApplicationID = ?";
    db.query(query, [applicationId], callback);
};