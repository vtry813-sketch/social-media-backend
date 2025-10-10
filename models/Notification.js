const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Notification must have a recipient']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Notification must have a sender']
  },
  type: {
    type: String,
    enum: [
      'like',           // Someone liked your post/comment
      'comment',        // Someone commented on your post
      'reply',          // Someone replied to your comment
      'follow',         // Someone followed you
      'follow_request', // Someone sent you a follow request
      'share',          // Someone shared your post
      'mention',        // Someone mentioned you in a post/comment
      'tag'             // Someone tagged you in a post
    ],
    required: [true, 'Notification type is required']
  },
  // Reference to the related entity
  entityType: {
    type: String,
    enum: ['post', 'comment', 'user'],
    required: [true, 'Entity type is required']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Entity ID is required'],
    refPath: 'entityType'
  },
  // Additional context
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  // Read status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  // For grouping similar notifications
  groupKey: {
    type: String // e.g., "post_like_123" for grouping multiple likes on same post
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ sender: 1, type: 1 });
notificationSchema.index({ groupKey: 1 });

// Virtual for time since notification
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();

  // Populate sender info for real-time notifications
  await notification.populate('sender', 'username firstName lastName profilePicture');

  return notification;
};

// Static method to mark as read
notificationSchema.statics.markAsRead = function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ recipient: userId, isRead: false, isActive: true });
};

// Static method to get notifications for user
notificationSchema.statics.getUserNotifications = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({ recipient: userId, isActive: true })
    .populate('sender', 'username firstName lastName profilePicture')
    .populate('entityId', 'content username') // Populate basic info from related entity
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Pre-save middleware to generate group key for certain types
notificationSchema.pre('save', function(next) {
  if (this.type === 'like' && this.entityType === 'post') {
    this.groupKey = `post_like_${this.entityId}`;
  } else if (this.type === 'comment' && this.entityType === 'post') {
    this.groupKey = `post_comment_${this.entityId}`;
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);