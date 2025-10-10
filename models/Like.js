const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Like must have a user']
  },
  entityType: {
    type: String,
    enum: ['post', 'comment'],
    required: [true, 'Entity type is required']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Entity ID is required'],
    refPath: 'entityType'
  }
}, {
  timestamps: true
});

// Compound index to ensure unique likes
likeSchema.index({ user: 1, entityType: 1, entityId: 1 }, { unique: true });

// Index for efficient queries
likeSchema.index({ entityType: 1, entityId: 1 });
likeSchema.index({ user: 1, createdAt: -1 });

// Static method to toggle like
likeSchema.statics.toggleLike = async function(userId, entityType, entityId) {
  const existingLike = await this.findOne({ user: userId, entityType, entityId });

  if (existingLike) {
    // Unlike
    await this.deleteOne({ _id: existingLike._id });
    return { action: 'unliked', like: null };
  } else {
    // Like
    const like = new this({ user: userId, entityType, entityId });
    await like.save();
    return { action: 'liked', like };
  }
};

// Static method to check if user liked entity
likeSchema.statics.hasLiked = function(userId, entityType, entityId) {
  return this.findOne({ user: userId, entityType, entityId });
};

module.exports = mongoose.model('Like', likeSchema);