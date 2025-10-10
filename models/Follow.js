const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Follow relationship must have a follower']
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Follow relationship must have a following user']
  },
  // Status of the follow request (for private accounts)
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'accepted' // Default to accepted for public accounts
  }
}, {
  timestamps: true
});

// Compound index to ensure unique follow relationships
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Index for efficient queries
followSchema.index({ following: 1, status: 1 });
followSchema.index({ follower: 1, status: 1 });

// Pre-save validation to prevent self-following
followSchema.pre('save', function(next) {
  if (this.follower.toString() === this.following.toString()) {
    const error = new Error('Users cannot follow themselves');
    return next(error);
  }
  next();
});

// Static method to get followers
followSchema.statics.getFollowers = function(userId, status = 'accepted') {
  return this.find({ following: userId, status })
    .populate('follower', 'username firstName lastName profilePicture bio');
};

// Static method to get following
followSchema.statics.getFollowing = function(userId, status = 'accepted') {
  return this.find({ follower: userId, status })
    .populate('following', 'username firstName lastName profilePicture bio');
};

// Static method to check if user A follows user B
followSchema.statics.isFollowing = function(followerId, followingId) {
  return this.findOne({
    follower: followerId,
    following: followingId,
    status: 'accepted'
  });
};

// Static method to get follow stats
followSchema.statics.getFollowStats = async function(userId) {
  const [followersCount, followingCount] = await Promise.all([
    this.countDocuments({ following: userId, status: 'accepted' }),
    this.countDocuments({ follower: userId, status: 'accepted' })
  ]);

  return { followersCount, followingCount };
};

module.exports = mongoose.model('Follow', followSchema);