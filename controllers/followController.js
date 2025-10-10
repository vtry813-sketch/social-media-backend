const Follow = require('../models/Follow');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Follow a user
// @route   POST /api/follow/:userId
// @access  Private
const followUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Cannot follow yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    // Check if user exists
    const userToFollow = await User.findById(userId);
    if (!userToFollow || !userToFollow.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: req.user._id,
      following: userId
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }

    // Create follow relationship
    const follow = await Follow.create({
      follower: req.user._id,
      following: userId,
      status: userToFollow.isPrivate ? 'pending' : 'accepted'
    });

    // Update user counts
    await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(userId, { $inc: { followersCount: 1 } });

    // Create notification if not private account
    if (!userToFollow.isPrivate) {
      await Notification.createNotification({
        recipient: userId,
        sender: req.user._id,
        type: 'follow',
        entityType: 'user',
        entityId: req.user._id,
        message: `${req.user.username} started following you`
      });
    } else {
      // For private accounts, create follow request notification
      await Notification.createNotification({
        recipient: userId,
        sender: req.user._id,
        type: 'follow_request',
        entityType: 'user',
        entityId: req.user._id,
        message: `${req.user.username} sent you a follow request`
      });
    }

    res.status(201).json({
      success: true,
      message: userToFollow.isPrivate ? 'Follow request sent' : 'User followed successfully',
      data: {
        follow: {
          status: follow.status,
          following: {
            _id: userToFollow._id,
            username: userToFollow.username,
            firstName: userToFollow.firstName,
            lastName: userToFollow.lastName,
            profilePicture: userToFollow.profilePicture
          }
        }
      }
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error following user'
    });
  }
};

// @desc    Unfollow a user
// @route   DELETE /api/follow/:userId
// @access  Private
const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find and delete follow relationship
    const follow = await Follow.findOneAndDelete({
      follower: req.user._id,
      following: userId
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'Not following this user'
      });
    }

    // Update user counts
    await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(userId, { $inc: { followersCount: -1 } });

    res.json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unfollowing user'
    });
  }
};

// @desc    Accept follow request
// @route   PUT /api/follow/:userId/accept
// @access  Private (request recipient only)
const acceptFollowRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find pending follow request
    const follow = await Follow.findOne({
      follower: userId,
      following: req.user._id,
      status: 'pending'
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'Follow request not found'
      });
    }

    // Update status to accepted
    follow.status = 'accepted';
    await follow.save();

    // Create notification
    await Notification.createNotification({
      recipient: userId,
      sender: req.user._id,
      type: 'follow',
      entityType: 'user',
      entityId: req.user._id,
      message: `${req.user.username} accepted your follow request`
    });

    res.json({
      success: true,
      message: 'Follow request accepted'
    });
  } catch (error) {
    console.error('Accept follow request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error accepting follow request'
    });
  }
};

// @desc    Reject follow request
// @route   PUT /api/follow/:userId/reject
// @access  Private (request recipient only)
const rejectFollowRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find and delete pending follow request
    const follow = await Follow.findOneAndDelete({
      follower: userId,
      following: req.user._id,
      status: 'pending'
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'Follow request not found'
      });
    }

    res.json({
      success: true,
      message: 'Follow request rejected'
    });
  } catch (error) {
    console.error('Reject follow request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting follow request'
    });
  }
};

// @desc    Get followers
// @route   GET /api/follow/:userId/followers
// @access  Private/Public (depending on privacy)
const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check user exists and privacy
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Privacy check
    if (user.isPrivate && (!req.user || req.user._id.toString() !== userId)) {
      const isFollowing = await Follow.isFollowing(req.user?._id, user._id);
      if (!isFollowing) {
        return res.status(403).json({
          success: false,
          message: 'This account is private'
        });
      }
    }

    const followers = await Follow.getFollowers(userId, 'accepted')
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Follow.countDocuments({
      following: userId,
      status: 'accepted'
    });

    res.json({
      success: true,
      data: {
        followers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting followers'
    });
  }
};

// @desc    Get following
// @route   GET /api/follow/:userId/following
// @access  Private/Public (depending on privacy)
const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check user exists and privacy
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Privacy check
    if (user.isPrivate && (!req.user || req.user._id.toString() !== userId)) {
      const isFollowing = await Follow.isFollowing(req.user?._id, user._id);
      if (!isFollowing) {
        return res.status(403).json({
          success: false,
          message: 'This account is private'
        });
      }
    }

    const following = await Follow.getFollowing(userId, 'accepted')
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Follow.countDocuments({
      follower: userId,
      status: 'accepted'
    });

    res.json({
      success: true,
      data: {
        following,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting following'
    });
  }
};

// @desc    Get follow requests (for private accounts)
// @route   GET /api/follow/requests
// @access  Private
const getFollowRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const requests = await Follow.find({
      following: req.user._id,
      status: 'pending'
    })
      .populate('follower', 'username firstName lastName profilePicture bio')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Follow.countDocuments({
      following: req.user._id,
      status: 'pending'
    });

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get follow requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting follow requests'
    });
  }
};

// @desc    Check follow status
// @route   GET /api/follow/:userId/status
// @access  Private
const getFollowStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const follow = await Follow.findOne({
      follower: req.user._id,
      following: userId
    });

    const isFollowing = !!follow && follow.status === 'accepted';
    const hasPendingRequest = !!follow && follow.status === 'pending';

    res.json({
      success: true,
      data: {
        isFollowing,
        hasPendingRequest,
        status: follow ? follow.status : null
      }
    });
  } catch (error) {
    console.error('Get follow status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting follow status'
    });
  }
};

module.exports = {
  followUser,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  getFollowers,
  getFollowing,
  getFollowRequests,
  getFollowStatus
};