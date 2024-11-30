const db = require('../models/db');  // Assuming you're using mysql2 or any other DB library

// Model to create a notification in the database
exports.createNotification = (userId, message) => {
  const query = 'INSERT INTO notifications (user_id, message) VALUES (?, ?)';
  return db.query(query, [userId, message]);
};

// Model to fetch notifications for a user
exports.getNotifications = (userId) => {
  const query = 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC';
  return db.query(query, [userId]);
};

// Mark notification as read
exports.markAsRead = (notificationId) => {
  const query = 'UPDATE notifications SET is_read = TRUE WHERE id = ?';
  return db.query(query, [notificationId]);
};

exports.getNotificationsFromComments = (userId) => {
    const query = `
      SELECT notifications.*, forum_posts.Title as post_title, forum_comments.Content as comment_text 
      FROM notifications 
      JOIN forum_posts ON forum_posts.AuthorID = notifications.user_id
      JOIN forum_comments ON forum_comments.PostID = forum_posts.PostID
      WHERE notifications.user_id = ? 
      ORDER BY notifications.created_at DESC`;
    return db.query(query, [userId]);
  };