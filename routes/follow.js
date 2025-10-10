const express = require('express');
const {
  followUser,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  getFollowers,
  getFollowing,
  getFollowRequests,
  getFollowStatus
} = require('../controllers/followController');

const { protect } = require('../middleware/auth');
const {
  validateFollow,
  validatePagination,
  validateObjectId
} = require('../middleware/validation');

const router = express.Router();

// All follow routes require authentication
router.use(protect);

router.post('/:userId', validateFollow, followUser);
router.delete('/:userId', validateFollow, unfollowUser);

router.put('/:userId/accept', validateObjectId('userId'), acceptFollowRequest);
router.put('/:userId/reject', validateObjectId('userId'), rejectFollowRequest);

router.get('/:userId/followers', validateObjectId('userId'), validatePagination, getFollowers);
router.get('/:userId/following', validateObjectId('userId'), validatePagination, getFollowing);

router.get('/:userId/status', validateObjectId('userId'), getFollowStatus);

router.get('/requests', validatePagination, getFollowRequests);

module.exports = router;