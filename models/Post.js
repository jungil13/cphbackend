const db = require('../models/db');

class Post {
  static fetchAllByCategory(categoryID) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*, 
               u.FullName AS AuthorFullName, 
               u.ProfilePhoto AS AuthorProfilePhoto, 
               c.Name AS CategoryName
        FROM forum_posts p
        JOIN Users u ON p.AuthorID = u.UserID
        JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE p.CategoryID = ?
        ORDER BY p.PostDate DESC
      `;
      db.query(sql, [categoryID], (err, results) => {
        if (err) return reject(err);
  
        // Format PostDate
        const formattedResults = results.map(post => {
          return {
            ...post,
            PostDate: post.PostDate ? new Date(post.PostDate).toLocaleString('en-US', {
              month: 'long',
              day: '2-digit',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            }) : null
          };
        });
        
        resolve(formattedResults);
      });
    });
  }
  
  
  static fetchAllByID(postID) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*, 
               u.FullName AS AuthorFullName, 
               u.ProfilePhoto AS AuthorProfilePhoto, 
               c.Name AS CategoryName
        FROM forum_posts p
        JOIN Users u ON p.AuthorID = u.UserID
        JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE p.PostID = ?
        ORDER BY p.PostDate DESC
      `;
      db.query(sql, [postID], (err, results) => {
        if (err) return reject(err);
  
        // Format PostDate
        const formattedResults = results.map(post => {
          return {
            ...post,
            PostDate: post.PostDate ? new Date(post.PostDate).toLocaleString('en-US', {
              month: 'long',
              day: '2-digit',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            }) : null
          };
        });
  
        resolve(formattedResults);
      });
    });
  }
  
  
  static create(userID, categoryID, title, content, images) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO forum_posts (AuthorID, CategoryID, Title, Content, Images)
            VALUES (?, ?, ?, ?, ?)
        `;
        const imagePaths = JSON.stringify(images); // Store images as a JSON array
        db.query(sql, [userID, categoryID, title, content, imagePaths], (err, result) => {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
}

static getAll(page, perPage, searchQuery = '') {
  return new Promise((resolve, reject) => {
      const offset = (page - 1) * perPage;

      // Base query to get the count of posts matching the search query
      let countQuery = `
          SELECT COUNT(*) AS totalCount
          FROM forum_posts p
          JOIN Users u ON p.AuthorID = u.UserID
          JOIN Categories c ON p.CategoryID = c.CategoryID
      `;

      // Add search query condition for the count query
      const searchParams = [];
      if (searchQuery) {
          countQuery += `
              WHERE p.Title LIKE ? 
              OR u.FullName LIKE ?
              OR c.Name LIKE ?
          `;
          searchParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
      }

      // Execute the count query to get the total number of posts
      db.query(countQuery, searchParams, (err, countResults) => {
          if (err) {
              reject(err);
              return;
          }

          const totalCount = countResults[0].totalCount;

          // Build the main query to get the posts for the current page
          let query = `
              SELECT 
                  p.*, 
                  u.FullName AS AuthorFullName,
                  c.Name AS CategoryName
              FROM forum_posts p
              JOIN Users u ON p.AuthorID = u.UserID
              JOIN Categories c ON p.CategoryID = c.CategoryID
          `;

          // Add search query condition
          if (searchQuery) {
              query += `
                  WHERE p.Title LIKE ? 
                  OR u.FullName LIKE ?
                  OR c.Name LIKE ?
              `;
          }

          // Add pagination (LIMIT and OFFSET)
          query += ` ORDER BY p.PostDate DESC LIMIT ? OFFSET ?`;

          // Execute the main query with pagination
          const queryParams = [...searchParams, perPage, offset];
          db.query(query, queryParams, (err, results) => {
              if (err) {
                  reject(err);
                  return;
              }

              const formattedResults = results.map(post => ({
                  ...post,
                  PostDate: post.PostDate ? new Date(post.PostDate).toLocaleString('en-US', {
                      month: 'long', 
                      day: '2-digit',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true 
                  }) : post.PostDate,
                  Image: post.Images // Assuming Images is the column name in your database
              }));

              resolve({
                  posts: formattedResults,
                  totalCount: totalCount,
              });
          });
      });
  });
}
  

      static getForumCount = (callback) => {
        db.query('SELECT COUNT(*) AS count FROM forum_posts', (err, results) => {
          if (err) {
            console.error("Error fetching forum count:", err);
            callback(err, null);
          } else {
            callback(null, results[0].count);
          }
        });
      };

      static getApplicationsCount = (callback) => {
        db.query('SELECT COUNT(*) AS count FROM applications', (err, results) => {
          if (err) {
            console.error("Error fetching applications count:", err);
            callback(err, null);
          } else {
            callback(null, results[0].count);
          }
        });
      };

      static getCommentsCount = (callback) => {
        db.query('SELECT COUNT(*) AS count FROM forum_comments', (err, results) => {
          if (err) {
            console.error("Error fetching comments count:", err);
            callback(err, null);
          } else {
            callback(null, results[0].count);
          }
        });
      };

      static getMyPosts(userID) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT p.*, 
                       u.FullName AS AuthorFullName, 
                       u.ProfilePhoto AS AuthorProfilePhoto, 
                       c.Name AS CategoryName
                FROM forum_posts p
                JOIN Users u ON p.AuthorID = u.UserID
                JOIN Categories c ON p.CategoryID = c.CategoryID
                WHERE p.AuthorID = ?
                ORDER BY p.PostDate DESC
            `;
            db.query(query, [userID], (err, results) => {
                if (err) return reject(err);

                // Format PostDate
                const formattedResults = results.map(post => {
                    return {
                        ...post,
                        PostDate: post.PostDate ? new Date(post.PostDate).toLocaleString('en-US', {
                            month: 'long',
                            day: '2-digit',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                        }) : null
                    };
                });

                resolve(formattedResults);
            });
        });
    }

    static updatePost(postID, updatedData) {
      return new Promise((resolve, reject) => {
        const { Title, Content, UserID } = updatedData;
    
        // Validate that required fields are provided
        if (!Title || !Content) {
          return reject(new Error('Missing required fields: Title and Content'));
        }
    
        const query = 'UPDATE `forum_posts` SET Title = ?, Content = ? WHERE PostID = ? AND AuthorID = ?';
    
        db.query(query, [Title, Content, postID, UserID], (err, results) => {
          if (err) return reject(err);
    
          if (results.affectedRows === 0) {
            // Either no post was found, or user lacks authorization
            return reject(new Error('No post found or you are not authorized to update this post.'));
          }
    
          resolve(results);
        });
      });
    }
  

  static deletePost(postID, userID, callback) {
    const query = 'DELETE FROM forum_posts WHERE PostID = ? AND AuthorID = ?'; 
    db.query(query, [postID, userID], (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
}

static getPostById(postID) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM forum_posts WHERE PostID = ?';
    
    db.query(sql, [postID], (err, results) => {
      if (err) return reject(err);

      // If no post is found, resolve with null
      resolve(results.length > 0 ? results[0] : null);
    });
  });
}

static getAll(page, perPage, searchQuery = '') {
  return new Promise((resolve, reject) => {
      const offset = (page - 1) * perPage;

      // Base query to get the count of posts matching the search query
      let countQuery = `
          SELECT COUNT(*) AS totalCount
          FROM forum_posts p
          JOIN Users u ON p.AuthorID = u.UserID
          JOIN Categories c ON p.CategoryID = c.CategoryID
      `;

      // Add search query condition for the count query
      const searchParams = [];
      if (searchQuery) {
          countQuery += `
              WHERE p.Title LIKE ? 
              OR u.FullName LIKE ?
              OR c.Name LIKE ?
          `;
          searchParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
      }

      // Execute the count query to get the total number of posts
      db.query(countQuery, searchParams, (err, countResults) => {
          if (err) {
              reject(err);
              return;
          }

          const totalCount = countResults[0].totalCount;

          // Build the main query to get the posts for the current page
          let query = `
              SELECT 
                  p.*, 
                  u.FullName AS AuthorFullName,
                  c.Name AS CategoryName
              FROM forum_posts p
              JOIN Users u ON p.AuthorID = u.UserID
              JOIN Categories c ON p.CategoryID = c.CategoryID
          `;

          // Add search query condition
          if (searchQuery) {
              query += `
                  WHERE p.Title LIKE ? 
                  OR u.FullName LIKE ?
                  OR c.Name LIKE ?
              `;
          }

          // Add pagination (LIMIT and OFFSET)
          query += ` ORDER BY p.PostDate DESC LIMIT ? OFFSET ?`;

          // Execute the main query with pagination
          const queryParams = [...searchParams, perPage, offset];
          db.query(query, queryParams, (err, results) => {
              if (err) {
                  reject(err);
                  return;
              }

              const formattedResults = results.map(post => ({
                  ...post,
                  PostDate: post.PostDate ? new Date(post.PostDate).toLocaleString('en-US', {
                      month: 'long', 
                      day: '2-digit',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true 
                  }) : post.PostDate
              }));

              resolve({
                  posts: formattedResults,
                  totalCount: totalCount,
              });
          });
      });
  });
}

}

module.exports = Post;
