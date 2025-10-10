const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Post must have an author']
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: [2000, 'Post content cannot exceed 2000 characters'],
    trim: true
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String, // For cloud storage like Cloudinary
      required: true
    },
    alt: {
      type: String,
      default: ''
    }
  }],
  // Engagement metrics
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  commentsCount: {
    type: Number,
    default: 0
  },
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  sharesCount: {
    type: Number,
    default: 0
  },
  // Post metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: {
    type: String,
    trim: true
  },
  // Privacy settings
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  // Edit history
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  originalContent: {
    type: String
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  // For shared posts
  sharedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  shareText: {
    type: String,
    maxlength: [500, 'Share text cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likesCount: -1 });
postSchema.index({ commentsCount: -1 });
postSchema.index({ sharesCount: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ visibility: 1 });

// Virtual for total engagement
postSchema.virtual('engagementCount').get(function() {
  return this.likesCount + this.commentsCount + this.sharesCount;
});

// Pre-save middleware to update counts
postSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
  if (this.isModified('shares')) {
    this.sharesCount = this.shares.length;
  }
  next();
});

// Static method to get posts for user's feed
postSchema.statics.getFeedPosts = function(userId, followingIds, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    $or: [
      { author: { $in: followingIds } },
      { author: userId }
    ],
    visibility: 'public',
    isActive: true
  })
  .populate('author', 'username firstName lastName profilePicture')
  .populate('sharedPost')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get popular posts
postSchema.statics.getPopularPosts = function(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    visibility: 'public',
    isActive: true,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  })
  .populate('author', 'username firstName lastName profilePicture')
  .sort({ engagementCount: -1 })
  .skip(skip)
  .limit(limit);
};

// Instance method to check if user liked the post
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Instance method to check if user shared the post
postSchema.methods.isSharedBy = function(userId) {
  return this.shares.some(share => share.user.toString() === userId.toString());
};

module.exports = mongoose.model('Post', postSchema);