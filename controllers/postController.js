const Post = require('../models/Post');

exports.getPostsByCategory = async (req, res) => {
    try {
        const posts = await Post.fetchAllByCategory(req.params.categoryID);
        res.json(posts);
    } catch (err) {
        res.status(500).send({ message: 'Failed to fetch posts', error: err });
    }
};

exports.getPostsByID = async (req, res) => {
  try {
      const post = await Post.fetchAllByID(req.params.postID);
      if (post.length === 0) {
          return res.status(404).send({ message: 'Post not found' });
      }
      res.json(post[0]);
  } catch (err) {
      res.status(500).send({ message: 'Failed to fetch post', error: err });
  }
};


exports.createPost = async (req, res) => {
  const { categoryID, title, content } = req.body;

  if (!title || !content) {
      return res.status(400).send({ message: 'Title and content cannot be null' });
  }

  // Check uploaded images
  const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
  if (images.length > 4) {
      return res.status(400).send({ message: 'You can upload up to 4 images only.' });
  }

  try {
      const userID = req.user.id;
      const postID = await Post.create(userID, categoryID, title, content, images);

      res.status(201).send({ message: 'Post created successfully', postID, images });
  } catch (err) {
      console.error(err);
      res.status(500).send({ message: 'Failed to create post', error: err });
  }
};


  exports.getAllPosts = async (req, res) => {
    const { page = 1, pageSize = 10, searchQuery = '' } = req.query;

    try {
        const { posts, totalCount } = await Post.getAll(parseInt(page), parseInt(pageSize), searchQuery);

        // Calculate total pages based on totalCount and pageSize
        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            posts,
            totalPages,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
};

exports.getMyPosts = (req, res) => {
  const userID = req.user.id; 
  Post.getMyPosts(userID)
      .then(posts => {
          res.status(200).json(posts);
      })
      .catch(err => {
          console.error('Error fetching posts:', err);
          res.status(500).json({ message: 'Error fetching posts' });
      });
};


exports.updatePost = async (req, res) => {
    const userID = req.user.id;
    const isAdmin = req.user.userType === 'Admin';
  
    try {
      const post = await Post.getPostById(req.params.postID);
  
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
  
      // Check if the user is either the author or an admin
      if (post.AuthorID !== userID && !isAdmin) {
        return res.status(403).json({ message: 'Access forbidden: You are not authorized to update this post.' });
      }
  
      const updatedData = { ...req.body, UserID: post.AuthorID };
  
      await Post.updatePost(req.params.postID, updatedData);
      res.status(200).json({ message: 'Post updated successfully' });
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ message: 'Error updating post', error: error.message });
    }
  };
  

exports.deletePost = (req, res) => {
  const userID = req.user.id; 
  Post.deletePost(req.params.postID, userID, (err, result) => {
      if (err) {
          console.error(err); 
          return res.status(500).json({ message: 'Error deleting post', error: err.message });
      }
      if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Post not found or you do not have permission to delete this post' });
      }
      res.status(200).json({ message: 'Post deleted successfully' });
  });
};

exports.getPosts = (req, res) => {
  const page = parseInt(req.query.page) || 1; // Get the page number from query params
  const perPage = parseInt(req.query.perPage) || 4; // Get the number of posts per page
  const searchQuery = req.query.search || ''; // Get the search query from query params

  Post.getAll(page, perPage, searchQuery)
      .then(({ posts, totalCount }) => {
          res.json({
              posts,
              totalCount,
              currentPage: page,
              totalPages: Math.ceil(totalCount / perPage) // Calculate total pages
          });
      })
      .catch(err => {
          return res.status(500).json({ message: 'Error fetching posts', error: err });
      });
};