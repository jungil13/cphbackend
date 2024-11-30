const path = require('path');
const fs = require('fs');
const Report = require("../models/report");

exports.addReport = (req, res) => {
  if (!req.user) {
    return res.status(403).json({ error: "User not authenticated" });
  }

  const { reportType, description, location, contactInfo } = req.body;

  const photo =
    req.files && req.files.photo
      ? JSON.stringify(
          req.files.photo.map((file) => file.path.replace("uploads/", ""))
        )
      : null;

  if (!photo) {
    return res
      .status(400)
      .json({ error: "At least one photo is required for the report." });
  }

  const reportData = {
    reporterID: req.user.id,
    reportType,
    description,
    location,
    contactInfo,
    photo,
    status: "Open",
  };

  Report.addReport(reportData, (err, result) => {
    if (err) {
      console.error("Error adding report:", err);
      return res
        .status(500)
        .json({ error: "Internal server error", details: err.message });
    }
    res
      .status(201)
      .json({
        message: "Report added successfully!",
        reportId: result.insertId,
      });
  });
};

exports.getAllReports = (req, res) => {
  const { page = 1, pageSize = 10, searchQuery = '' } = req.query;

  Report.getAllReports(parseInt(page), parseInt(pageSize), searchQuery, (err, result) => {
    if (err) {
      console.error("Failed to retrieve all reports:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    const { reports, totalCount } = result;

    // Calculate total pages based on totalCount and pageSize
    const totalPages = Math.ceil(totalCount / pageSize);

    res.json({
      reports,
      totalPages,
      currentPage: parseInt(page),
    });
  });
};
exports.getReportsById = async (req, res) => {
  try {
    const reportId = req.params.id;
    const report = await Report.getReportsById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    res.json(report);
  } catch (err) {
    console.error("Failed to retrieve report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.getReportDetails = (req, res) => {
  const reportId = req.params.id;
  Report.getReportDetails(reportId, (err, report) => {
    if (err) {
      console.error("Error fetching report details:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    res.json(report);
  });
};


exports.getReportsByReporterId = (req, res) => {
  console.log('Authenticated user ID:', req.user.id); 

  const ReporterID = req.user.id;

  Report.getReportsByReporterId(ReporterID, (err, reports) => {
      if (err) {
          console.error("Failed to retrieve reports:", err);
          return res.status(500).json({ error: "Internal server error" });
      }
      console.log('Reports retrieved:', reports); 

      if (reports.length === 0) {
          return res.status(404).json({ message: "No reports found for this user" });
      }
      res.json(reports);
  });
};

exports.updateReport = (req, res) => {
  const reportId = req.params.id;
  const userId = req.user.id;

  Report.getReportsById(reportId)
      .then(report => {
          if (!report) {
              console.error("Error fetching report:", 'Report not found');
              return res.status(404).json({ message: 'Report not found' });
          }

          if (report.ReporterID !== userId) {
              return res.status(403).json({ message: 'Unauthorized' });
          }

        
          let newPhotoPaths = report.Photo ? JSON.parse(report.Photo) : [];

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
              ReporterID: userId,

          };

          Report.updateReport(reportId, updateFields, (err) => {
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

exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.getReportsById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching report by ID:', error);
    res.status(500).json({ message: 'Failed to fetch report', error: error.message });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.getReportsById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    await Report.deleteReport(id);
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ message: 'Failed to delete report', error: err.message });
  }
};
