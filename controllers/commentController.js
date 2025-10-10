const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// @desc    Create a comment
// @route   POST /api/posts/:postId/comments
// @access  Private
const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    // Check if post exists and is active
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if parent comment exists (for replies)
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment || !parentComment.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }
    }

    const comment = await Comment.create({
      author: req.user._id,
      post: postId,
      content,
      parentComment: parentCommentId || null
    });

    // Populate author info
    await comment.populate('author', 'username firstName lastName profilePicture');

    // Update post comments count
    post.comments.push(comment._id);
    await post.save();

    // Update parent comment replies count if it's a reply
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      parentComment.replies.push(comment._id);
      await parentComment.save();
    }

    // Create notification
    const notificationType = parentCommentId ? 'reply' : 'comment';
    const message = parentCommentId
      ? `${req.user.username} replied to your comment`
      : `${req.user.username} commented on your post`;

    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.createNotification({
        recipient: post.author,
        sender: req.user._id,
        type: notificationType,
        entityType: 'comment',
        entityId: comment._id,
        message
      });
    }

    // If it's a reply, also notify the parent comment author
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment.author.toString() !== req.user._id.toString() &&
          parentComment.author.toString() !== post.author.toString()) {
        await Notification.createNotification({
          recipient: parentComment.author,
          sender: req.user._id,
          type: 'reply',
          entityType: 'comment',
          entityId: comment._id,
          message: `${req.user.username} replied to your comment`
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: { comment }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating comment'
    });
  }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:postId/comments
// @access  Public/Private (depending on post visibility)
const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check if post exists and user can view it
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check post visibility permissions (similar to getPost)
    // ... visibility checks would go here

    const comments = await Comment.find({
      post: postId,
      parentComment: null, // Only top-level comments
      isActive: true
    })
      .populate('author', 'username firstName lastName profilePicture')
      .populate({
        path: 'replies',
        populate: {
          path: 'author',
          select: 'username firstName lastName profilePicture'
        }
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Comment.countDocuments({
      post: postId,
      parentComment: null,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting comments'
    });
  }
};

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private (comment author only)
const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment || !comment.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    const { content } = req.body;

    // Store original content if not already stored
    if (!comment.originalContent) {
      comment.originalContent = comment.content;
    }

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();
    await comment.populate('author', 'username firstName lastName profilePicture');

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: { comment }
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating comment'
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private (comment author or admin)
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment || !comment.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Soft delete
    comment.isActive = false;
    await comment.save();

    // Update post comments count
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id }
    });

    // Update parent comment replies count if it's a reply
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id }
      });
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting comment'
    });
  }
};

// @desc    Like/Unlike comment
// @route   POST /api/comments/:id/like
// @access  Private
const likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment || !comment.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const isLiked = comment.isLikedBy(req.user._id);

    if (isLiked) {
      // Unlike
      comment.likes = comment.likes.filter(like => like.user.toString() !== req.user._id.toString());
    } else {
      // Like
      comment.likes.push({ user: req.user._id });
    }

    await comment.save();

    // Create notification if liking (not unliking)
    if (!isLiked && comment.author.toString() !== req.user._id.toString()) {
      await Notification.createNotification({
        recipient: comment.author,
        sender: req.user._id,
        type: 'like',
        entityType: 'comment',
        entityId: comment._id,
        message: `${req.user.username} liked your comment`
      });
    }

    res.json({
      success: true,
      message: isLiked ? 'Comment unliked' : 'Comment liked',
      data: {
        likesCount: comment.likesCount,
        isLiked: !isLiked
      }
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liking comment'
    });
  }
};

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  likeComment
};