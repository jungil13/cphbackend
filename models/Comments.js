const db = require('../models/db');

class Comment {
    static create(postID, content, userID) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO forum_comments (PostID, CommenterID, Content) VALUES (?, ?, ?)';
            db.query(sql, [postID, userID, content], (err, result) => {
                if (err) return reject(err);
                resolve(result.insertId);
            });
        });
    }

    static fetchCommentsByPost(postID) {
      return new Promise((resolve, reject) => {
        const sql = `
          SELECT c.*, 
                 u.FullName AS CommenterFullName, 
                 u.ProfilePhoto AS CommenterProfilePhoto  -- Include ProfilePhoto
          FROM forum_comments c
          JOIN Users u ON c.CommenterID = u.UserID
          WHERE c.PostID = ?
          ORDER BY c.CommentDate DESC
        `;
        db.query(sql, [postID], (err, results) => {
          if (err) return reject(err);
          
          const formattedResults = results.map(comment => {
            return {
              ...comment,
              CommentDate: new Date(comment.CommentDate).toLocaleString('en-US', {
                month: 'long',
                day: '2-digit',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })
            };
          });
    
          resolve(formattedResults);
        });
      });
    }
    

    static getAll(page, perPage, searchQuery = '') {
      return new Promise((resolve, reject) => {
          const offset = (page - 1) * perPage;
  
          // Base query to get the count of comments matching the search query
          let countQuery = `
              SELECT COUNT(*) AS totalCount
              FROM forum_comments fc
              JOIN users u ON fc.CommenterID = u.UserID
              JOIN forum_posts fp ON fc.PostID = fp.PostID
          `;
  
          // Add search query condition for the count query
          const searchParams = [];
          if (searchQuery) {
              countQuery += `
                  WHERE fc.Content LIKE ? 
                  OR u.FullName LIKE ?
                  OR fp.Title LIKE ?
              `;
              searchParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
          }
  
          // Execute the count query to get the total number of comments
          db.query(countQuery, searchParams, (err, countResults) => {
              if (err) {
                  reject(err);
                  return;
              }
  
              const totalCount = countResults[0].totalCount;
  
              // Build the main query to get the comments for the current page
              let query = `
                  SELECT 
                      fc.*, 
                      u.FullName AS CommenterName,
                      u.ProfilePhoto AS CommenterProfilePhoto,
                      fp.Title AS PostTitle
                  FROM forum_comments fc
                  JOIN users u ON fc.CommenterID = u.UserID
                  JOIN forum_posts fp ON fc.PostID = fp.PostID
              `;
  
              // Add search query condition
              if (searchQuery) {
                  query += `
                      WHERE fc.Content LIKE ? 
                      OR u.FullName LIKE ?
                      OR fp.Title LIKE ?
                  `;
              }
  
              // Add pagination (LIMIT and OFFSET)
              query += ` ORDER BY fc.CommentDate DESC LIMIT ? OFFSET ?`;
  
              // Execute the main query with pagination
              const queryParams = [...searchParams, perPage, offset];
              db.query(query, queryParams, (err, results) => {
                  if (err) {
                      reject(err);
                      return;
                  }
  
                  resolve({
                      comments: results,
                      totalCount: totalCount,
                  });
              });
          });
      });
  }
      
  static updateComment(commentID, content, commenterID) {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE forum_comments SET Content = ? WHERE CommentID = ? AND (CommenterID = ? OR ? = "Admin")';
        console.log("Executing SQL:", sql, "with parameters:", [content, commentID, commenterID, commenterID]); // Log the SQL and parameters
        db.query(sql, [content, commentID, commenterID, 'Admin'], (err, results) => {
            if (err) return reject(err);
            console.log("Update results:", results); // Log the results of the update
            if (results.affectedRows === 0) {
                return reject(new Error("No rows affected. Comment may not exist or you are not authorized to edit it."));
            }
            resolve(results);
        });
    });
}

      static getCommentById(commentID) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM forum_comments WHERE CommentID = ?';
            db.query(query, [commentID], (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results[0]);
            });
        });
    }
    
      static removeComment(commentID, callback) {
        const sql = 'DELETE FROM forum_comments WHERE CommentID = ?';
        db.query(sql, [commentID], (err, results) => {
          if (err) return callback(err);
          callback(null, results);
        });
      }
    }

module.exports = Comment;
