const Comment = require('../models/Comments');

exports.addComment = async (req, res) => {
    const postID = req.body.postID;
    const content = req.body.content;
    const userID = req.user.id; 

    try {
        const commentID = await Comment.create(postID, content, userID);
        res.status(201).send({ message: 'Comment added successfully', commentID });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Failed to add comment', error: err });
    }
};

exports.getCommentsByPost = async (req, res) => {
    try {
        const comments = await Comment.fetchCommentsByPost(req.params.postID);
        res.json(comments);
    } catch (err) {
        console.error("Failed to fetch comments:", err);
        res.status(500).send({ message: 'Failed to fetch comments', error: err });
    }
};


exports.getAllComments = (req, res) => {
  const { page = 1, pageSize = 10, searchQuery = '' } = req.query;

  Comment.getAll(parseInt(page), parseInt(pageSize), searchQuery)
      .then(({ comments, totalCount }) => {
          // Calculate total pages based on totalCount and pageSize
          const totalPages = Math.ceil(totalCount / pageSize);

          res.json({
              comments,
              totalPages,
          });
      })
      .catch(err => {
          console.error("Error fetching comments:", err);
          res.status(500).json({ message: "Failed to retrieve comments", error: err });
      });
};

exports.editComment = async (req, res) => {
  const commentID = req.params.commentID;
  const { content } = req.body;
  const commenterID = req.user.id; // ID of the user making the request
  const isAdmin = req.user.userType === 'Admin'; // Check if user is Admin

  console.log("Received comment content:", content); // Debugging line to check if content is received
  console.log("Comment ID:", commentID); // Log the comment ID
  console.log("Commenter ID:", commenterID); // Log the commenter ID
  console.log("Is Admin:", isAdmin); // Log if the user is an admin

  if (!content) {
      return res.status(400).json({ msg: "Comment content is required" });
  }

  try {
      // Fetch the comment to check its existence and author
      const comment = await Comment.getCommentById(commentID);
      
      if (!comment) {
          return res.status(404).json({ msg: "Comment not found" });
      }

      console.log("Fetched comment:", comment); // Log the fetched comment
      console.log("Fetched CommenterID:", comment.CommenterID); // Log the CommenterID from the fetched comment

      // Check if the user is either the author or an admin
      if (comment.CommenterID !== commenterID && !isAdmin) {
          return res.status(403).json({ msg: "Access forbidden: You are not authorized to edit this comment" });
      }

      // Update the comment
      await Comment.updateComment(commentID, content, commenterID);
      res.json({ msg: "Comment updated successfully" });
  } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ msg: "Failed to update comment", error: error.message });
  }
};
  
  exports.deleteComment = (req, res) => {
    const commentID = req.params.commentID;
  
    Comment.removeComment(commentID, (err) => {
      if (err) {
        console.error("Error deleting comment:", err);
        return res.status(500).json({ msg: "Failed to delete comment", error: err });
      }
      res.json({ msg: "Comment deleted successfully" });
    });
};