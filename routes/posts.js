const express = require('express');
const {
  createPost,
  getPosts,
  getPopularPosts,
  getPost,
  updatePost,
  deletePost,
  likePost,
  sharePost,
  getUserPosts
} = require('../controllers/postController');

const { protect, optionalAuth } = require('../middleware/auth');
const {
  validatePostCreation,
  validatePostUpdate,
  validatePagination,
  validateObjectId
} = require('../middleware/validation');

const router = express.Router();

// Public routes (with optional auth for better UX)
router.get('/popular', optionalAuth, validatePagination, getPopularPosts);

// Protected routes
router.use(protect);

router.post('/', validatePostCreation, createPost);
router.get('/', validatePagination, getPosts);
router.get('/user/:userId', validateObjectId('userId'), validatePagination, getUserPosts);

router.get('/:id', validateObjectId('id'), getPost);
router.put('/:id', validateObjectId('id'), validatePostUpdate, updatePost);
router.delete('/:id', validateObjectId('id'), deletePost);

router.post('/:id/like', validateObjectId('id'), likePost);
router.post('/:id/share', validateObjectId('id'), sharePost);

module.exports = router;