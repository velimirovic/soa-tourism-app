const express = require('express');
const router = express.Router();
const { createBlog, getBlogs, getBlogById, updateBlog, deleteBlog, toggleLike } = require('../controllers/blogController');
const { addComment, updateComment, deleteComment } = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');

router.get('/', getBlogs);
router.get('/:id', getBlogById);
router.post('/', authenticate, createBlog);
router.put('/:id', authenticate, updateBlog);
router.delete('/:id', authenticate, deleteBlog);
router.post('/:id/like', authenticate, toggleLike);
router.post('/:id/comments', authenticate, addComment);
router.put('/:id/comments/:commentId', authenticate, updateComment);
router.delete('/:id/comments/:commentId', authenticate, deleteComment);

module.exports = router;
