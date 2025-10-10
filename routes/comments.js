const express = require('express');
const {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  likeComment
} = require('../controllers/commentController');

const { protect } = require('../middleware/auth');
const {
  validateCommentCreation,
  validateCommentUpdate,
  validatePagination,
  validateObjectId
} = require('../middleware/validation');

const router = express.Router();

// All comment routes require authentication
router.use(protect);

router.post('/posts/:postId/comments', validateCommentCreation, createComment);
router.get('/posts/:postId/comments', validateObjectId('postId'), validatePagination, getComments);

router.put('/:id', validateObjectId('id'), validateCommentUpdate, updateComment);
router.delete('/:id', validateObjectId('id'), deleteComment);

router.post('/:id/like', validateObjectId('id'), likeComment);

module.exports = router;