const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const { isAuthenticated, auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads'); // Save files in the 'uploads' folder
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique file name
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Limit size to 2MB per file
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif/; // Allowed file types
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (jpeg, jpg, png, gif) are allowed!'));
        }
    },
});

router.get('/posts/:categoryID', postController.getPostsByCategory);
router.get('/posts/id/:postID', postController.getPostsByID);
router.post('/posts', isAuthenticated, upload.array('images', 4), postController.createPost);
router.post('/comments', isAuthenticated, commentController.addComment);
router.get('/comments/post/:postID', isAuthenticated, commentController.getCommentsByPost);
router.get('/comments', isAuthenticated, commentController.getAllComments);

router.get('/posts', postController.getAllPosts);
router.get('/my-posts',isAuthenticated, postController.getMyPosts);
router.put('/edit-my-posts/:postID', isAuthenticated, auth('Admin'), postController.updatePost);
router.delete('/my-posts/:postID', isAuthenticated, postController.deletePost);
router.get('/latest-posts', postController.getPosts);


router.put('/comments/:commentID', isAuthenticated, auth('Admin'), commentController.editComment);
router.delete('/comments/:commentID', isAuthenticated, commentController.deleteComment);

module.exports = router;
