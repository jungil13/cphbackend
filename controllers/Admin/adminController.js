// Import necessary models or utilities
const UserModel = require("../../models/user");
const PetModel = require("../../models/Pet")
const ReportModel = require("../../models/report")
const ForumModel = require("../../models/Post")
const AdminModel = require("../../models/adminmodel")
const bcrypt = require('bcrypt');

exports.dashboard = (req, res) => {

    UserModel.findAllAdmins((err, admins) => {
        if (err) {
            return res.status(500).json({ message: "Failed to retrieve admin data." });
        }
        res.render('admin/dashboard', { admins });
    });
};

exports.getUserCount = (req, res) => {
    UserModel.getUserCount((err, count) => {
      if (err) {
        res.status(500).json({ message: 'Failed to retrieve user count', error: err });
      } else {
        res.json({ count });
      }
    });
  };

  exports.getPetCount = (req, res) => {
    PetModel.getPetCount((err, count) => {
      if (err) {
        res.status(500).json({ message: 'Failed to retrieve pets count', error: err });
      } else {
        res.json({ count });
      }
    });
  };

  exports.getReportCount = (req, res) => {
    ReportModel.getReportCount((err, count) => {
      if (err) {
        res.status(500).json({ message: 'Failed to retrieve report count', error: err });
      } else {
        res.json({ count });
      }
    });
  };

  exports.getForumCount = (req, res) => {
    ForumModel.getForumCount((err, count) => {
      if (err) {
        res.status(500).json({ message: 'Failed to retrieve forum count', error: err });
      } else {
        res.json({ count });
      }
    });
  };

  exports.getApplicationsCount = (req, res) => {
    ForumModel.getApplicationsCount((err, count) => {
      if (err) {
        res.status(500).json({ message: 'Failed to retrieve applications count', error: err });
      } else {
        res.json({ count });
      }
    });
  };

  exports.getCommentsCount = (req, res) => {
    ForumModel.getCommentsCount((err, count) => {
      if (err) {
        res.status(500).json({ message: 'Failed to retrieve comments count', error: err });
      } else {
        res.json({ count });
      }
    });
  };

  exports.getApplications = (req, res) => {
    // Retrieve query parameters, or set defaults
    const searchTerm = req.query.searchTerm || '';  // Default to empty string if not provided
    const page = parseInt(req.query.page, 10) || 1;  // Default to 1 if not provided
    const pageSize = parseInt(req.query.pageSize, 10) || 5;  // Default to 5 if not provided
    
    // Call the PetModel.getApplications method with the necessary parameters
    PetModel.getApplications(searchTerm, page, pageSize, (err, applications) => {
      if (err) {
        console.error("Failed to retrieve applications:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json(applications);
    });
  };
  
  
  exports.updatePet = (req, res) => {
    const petId = req.params.petId;
    const updates = req.body;
  
    AdminModel.updatePet(petId, updates, (err) => {
      if (err) return res.status(500).json({ message: 'Failed to update pet.' });
      res.json({ message: 'Pet updated successfully.' });
    });
  };

  exports.deletePet = (req, res) => {
    const petId = req.params.petId;
  
    AdminModel.deletePet(petId, (err) => {
      if (err) return res.status(500).json({ message: 'Failed to delete pet.' });
      res.json({ message: 'Pet deleted successfully.' });
    });
  };

exports.getPaginatedApplications = (req, res) => {
  const page = parseInt(req.query.page, 10) || 0;
  const limit = parseInt(req.query.limit, 10) || 10; 
  const offset = (page - 1) * limit;

  PetModel.getPaginatedApplications(limit, offset, (err, results, total) => {
    if (err) {
      console.error("Error fetching paginated applications:", err);
      return res.status(500).json({ message: "Internal server error", error: err });
    }
    const totalPages = Math.ceil(total / limit);
    res.json({
      data: results,
      currentPage: page,
      totalPages: totalPages,
      totalEntries: total
    });
  });
};

// Fetch all users
exports.getAllUsers = (req, res) => {
  // Extract pagination and search parameters from the request query
  const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
  const pageSize = parseInt(req.query.pageSize) || 10; // Default to 10 items per page
  const searchTerm = req.query.search || ''; // Default to empty string if no search term

  // Call the model function with the parameters
  UserModel.getAllUsers(page, pageSize, searchTerm, (err, result) => {
      if (err) {
          return res.status(500).json({ message: "Failed to retrieve users." });
      }
      // Send the response with pagination and search results
      res.json(result);
  });
};


exports.updateUser = (req, res) => {
  const userId = req.params.userId;
  const updates = req.body;
  const isAdmin = req.user.UserType === 'Admin';

  AdminModel.updateUser(userId, updates, isAdmin, (err, result) => {
    if (err) {
      console.error(err); // Log the error for debugging
      return res.status(500).json({ message: "Failed to update user." });
    }
    res.json({ message: "User updated successfully." });
  });
};

// Delete a user
exports.deleteUser = (req, res) => {
  const userId = req.params.userId;

  UserModel.deleteUser(userId, (err, result) => {
      if (err) {
          return res.status(500).json({ message: "Failed to delete user." });
      }
      res.json({ message: "User deleted successfully." });
  });
};

exports.updateReport = (req, res) => {
  const reportId = req.params.id;
  const userId = req.user.id;  // Assuming `req.user.id` is set correctly
  const isAdmin = req.user.userType === 'Admin';  // Use lowercase 'userType' here

  console.log('req.user:', req.user);  // Log the entire user object for debugging
  console.log('userType:', req.user.userType);  // Check if userType is set correctly
  console.log('isAdmin:', isAdmin);  // Log the admin status for debugging

  AdminModel.getReportsById(reportId)
      .then(report => {
          if (!report) {
              console.error("Error fetching report:", 'Report not found');
              return res.status(404).json({ message: 'Report not found' });
          }

          // Authorization check: allow if the user is the report owner or an Admin
          if (report.ReporterID !== userId && !isAdmin) {
              console.error("Unauthorized access attempt by user:", userId);
              return res.status(403).json({ message: 'Access forbidden: You are not authorized to update this report.' });
          }

          let newPhotoPaths = [];
          try {
              newPhotoPaths = report.Photo ? JSON.parse(report.Photo) : [];
          } catch (error) {
              console.error("Error parsing photo paths:", error);
              return res.status(500).json({ message: 'Error processing report photos', error: error.message });
          }

          // Update photo if uploaded
          if (req.file) {
              const newPhotoPath = req.file.filename;
              newPhotoPaths.push(`uploads/${newPhotoPath}`);
          }

          const updateFields = {
              ReportType: req.body.ReportType,
              Description: req.body.Description,
              Location: req.body.Location,
              Status: req.body.Status,
              Photo: JSON.stringify(newPhotoPaths),
          };

          AdminModel.updateReport(reportId, updateFields, (err) => {
              if (err) {
                  console.error("Failed to update report:", err);
                  return res.status(500).json({ message: 'Failed to update report', error: err.message });
              }
              res.json({ message: 'Report updated successfully' });
          });
      })
      .catch(err => {
          console.error("Error fetching report:", err);
          res.status(500).json({ message: 'Failed to fetch report', error: err.message });
      });
};




module.exports = exports;
