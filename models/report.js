const db = require("./db"); // Ensure this is the correct path to your database connection or pool

class Report {
  static addReport(reportData, callback) {
    const {
      reporterID,
      reportType,
      description,
      location,
      contactInfo,
      photo,
      status,
    } = reportData;
    const query = `
            INSERT INTO lost_found_reports (ReporterID, ReportType, Description, Location, ContactInfo, Photo, Status)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;
    db.query(
      query,
      [
        reporterID,
        reportType,
        description,
        location,
        contactInfo,
        photo,
        status,
      ],
      (err, results) => {
        callback(err, results);
      }
    );
  }

  static getAllReports(page, perPage, searchQuery = '', callback) {
    const offset = (page - 1) * perPage;
  
    // Base query to get the count of reports matching the search query
    let countQuery = `
      SELECT COUNT(*) AS totalCount
      FROM lost_found_reports
      JOIN users ON lost_found_reports.ReporterID = users.UserID
    `;
  
    // Add search query condition for the count query
    const searchParams = [];
    if (searchQuery) {
      countQuery += `
        WHERE lost_found_reports.Location LIKE ? 
        OR users.FullName LIKE ?
      `;
      searchParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }
  
    // Execute the count query to get the total number of reports
    db.query(countQuery, searchParams, (err, countResults) => {
      if (err) return callback(err, null);
  
      const totalCount = countResults[0].totalCount;
  
      // Build the main query to get the reports for the current page
      let query = `
        SELECT lost_found_reports.*, users.FullName AS reporterFullName 
        FROM lost_found_reports
        JOIN users ON lost_found_reports.ReporterID = users.UserID
      `;
  
      // Add search query condition
      if (searchQuery) {
        query += `
          WHERE lost_found_reports.Location LIKE ? 
          OR users.FullName LIKE ?
        `;
      }
  
      // Add pagination (LIMIT and OFFSET)
      query += ` ORDER BY lost_found_reports.DateReported DESC LIMIT ? OFFSET ?`;
  
      // Execute the main query with pagination
      const queryParams = [...searchParams, perPage, offset];
      db.query(query, queryParams, (err, results) => {
        if (err) return callback(err, null);
  
        // Format the DateReported field
        const formattedResults = results.map(report => {
          const dateReported = new Date(report.DateReported);
          const formattedDate = new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          }).format(dateReported);
  
          return {
            ...report,
            DateReported: formattedDate
          };
        });
  
        callback(null, {
          reports: formattedResults,
          totalCount: totalCount,
        });
      });
    });
  }

  static getReportDetails(reportId, callback) {
    const query = `
      SELECT lost_found_reports.*, users.FullName AS reporterFullName 
      FROM lost_found_reports
      JOIN users ON lost_found_reports.ReporterID = users.UserID
      WHERE lost_found_reports.ReportID = ?
    `;
    
    db.query(query, [reportId], (err, result) => {
      if (err) return callback(err, null);
      
      // Format the DateReported field if a result is found
      if (result.length > 0) {
        const report = result[0];
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
        callback(null, {
          ...report,
          DateReported: formattedDate
        });
      } else {
        callback(null, null); // No report found
      }
    });
  }

  static getReportsByReporterId(ReporterID, callback) {
    const query = `
      SELECT * FROM lost_found_reports WHERE ReporterID = ?
    `;
    
    db.query(query, [ReporterID], (err, results) => {
      if (err) return callback(err, null);
      
      // Format the DateReported field for each report
      const formattedResults = results.map(report => {
        const dateReported = new Date(report.DateReported);
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        }).format(dateReported);
  
        return {
          ...report,
          DateReported: formattedDate
        };
      });
  
      callback(null, formattedResults);
    });
  }

  static updateReport(ReportID, fields, callback) {
    let setClause = "SET ";
    const values = [];

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

    setClause = setClause.slice(0, -2);

    const query = `
            UPDATE lost_found_reports
            ${setClause}
            WHERE ReportID = ? AND ReporterID = ?
        `;

    values.push(ReportID, fields.ReporterID);

    console.log("Update query:", query);
    console.log("Update values:", values);
    db.query(query, values, callback);
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
  

  static deleteReport(reportId, callback) {
    const query = "DELETE FROM lost_found_reports WHERE ReportID = ?";
    db.query(query, [reportId], callback);
  }

  static getReportCount = (callback) => {
    db.query('SELECT COUNT(*) AS count FROM lost_found_reports', (err, results) => {
      if (err) {
        console.error("Error fetching reports count:", err);
        callback(err, null);
      } else {
        callback(null, results[0].count);
      }
    });
  };

}


module.exports = Report;
