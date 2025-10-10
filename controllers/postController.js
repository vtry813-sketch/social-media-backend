const Post = require('../models/Post');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const { getRedisClient } = require('../config/database');

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const { content, media, visibility = 'public', tags, mentions, location } = req.body;

    const post = await Post.create({
      author: req.user._id,
      content,
      media: media || [],
      visibility,
      tags: tags || [],
      mentions: mentions || [],
      location
    });

    // Populate author info
    await post.populate('author', 'username firstName lastName profilePicture');

    // Create notifications for mentions
    if (mentions && mentions.length > 0) {
      const mentionNotifications = mentions.map(userId => ({
        recipient: userId,
        sender: req.user._id,
        type: 'mention',
        entityType: 'post',
        entityId: post._id,
        message: `${req.user.username} mentioned you in a post`
      }));

      await Notification.insertMany(mentionNotifications);
    }

    // Invalidate cache
    const redis = getRedisClient();
    if (redis) {
      await redis.del('popular_posts');
      await redis.del(`user_feed:${req.user._id}`);
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: { post }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating post'
    });
  }
};

// @desc    Get all posts (feed)
// @route   GET /api/posts
// @access  Private
const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const redis = getRedisClient();
    const cacheKey = `user_feed:${req.user._id}:${page}:${limit}`;

    // Try to get from cache first
    if (redis) {
      const cachedPosts = await redis.get(cacheKey);
      if (cachedPosts) {
        return res.json({
          success: true,
          data: JSON.parse(cachedPosts)
        });
      }
    }

    // Get following users
    const following = await Follow.getFollowing(req.user._id);
    const followingIds = following.map(f => f.following._id);

    const posts = await Post.getFeedPosts(req.user._id, followingIds, page, limit);

    const total = await Post.countDocuments({
      $or: [
        { author: { $in: followingIds } },
        { author: req.user._id }
      ],
      visibility: 'public',
      isActive: true
    });

    const result = {
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    // Cache the result
    if (redis) {
      await redis.setex(cacheKey, 300, JSON.stringify(result)); // Cache for 5 minutes
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting posts'
    });
  }
};

// @desc    Get popular posts
// @route   GET /api/posts/popular
// @access  Public
const getPopularPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const redis = getRedisClient();
    const cacheKey = `popular_posts:${page}:${limit}`;

    // Try cache first
    if (redis) {
      const cachedPosts = await redis.get(cacheKey);
      if (cachedPosts) {
        return res.json({
          success: true,
          data: JSON.parse(cachedPosts)
        });
      }
    }

    const posts = await Post.getPopularPosts(page, limit);

    const result = {
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    };

    // Cache for 10 minutes
    if (redis) {
      await redis.setex(cacheKey, 600, JSON.stringify(result));
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get popular posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting popular posts'
    });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private/Public (depending on visibility)
const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username firstName lastName profilePicture isPrivate')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username firstName lastName profilePicture'
        }
      });

    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check visibility permissions
    if (post.visibility === 'private' && post.author._id.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This post is private'
      });
    }

    if (post.visibility === 'followers' && !req.user) {
      return res.status(403).json({
        success: false,
        message: 'This post is only visible to followers'
      });
    }

    if (post.visibility === 'followers' && req.user) {
      const isFollowing = await Follow.isFollowing(req.user._id, post.author._id);
      if (!isFollowing && post.author._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'This post is only visible to followers'
        });
      }
    }

    res.json({
      success: true,
      data: { post }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting post'
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private (post owner only)
const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const { content, visibility } = req.body;

    // Store original content for edit history
    if (!post.originalContent) {
      post.originalContent = post.content;
    }

    post.content = content || post.content;
    post.visibility = visibility || post.visibility;
    post.isEdited = true;
    post.editedAt = new Date();

    await post.save();
    await post.populate('author', 'username firstName lastName profilePicture');

    // Invalidate cache
    const redis = getRedisClient();
    if (redis) {
      await redis.del(`user_feed:${req.user._id}`);
      await redis.del('popular_posts');
    }

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: { post }
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating post'
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private (post owner or admin)
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    // Soft delete
    post.isActive = false;
    await post.save();

    // Invalidate cache
    const redis = getRedisClient();
    if (redis) {
      await redis.del(`user_feed:${req.user._id}`);
      await redis.del('popular_posts');
    }

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting post'
    });
  }
};

// @desc    Like/Unlike post
// @route   POST /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isLiked = post.isLikedBy(req.user._id);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(like => like.user.toString() !== req.user._id.toString());
    } else {
      // Like
      post.likes.push({ user: req.user._id });
    }

    await post.save();

    // Create notification if liking (not unliking)
    if (!isLiked && post.author.toString() !== req.user._id.toString()) {
      await Notification.createNotification({
        recipient: post.author,
        sender: req.user._id,
        type: 'like',
        entityType: 'post',
        entityId: post._id,
        message: `${req.user.username} liked your post`
      });
    }

    res.json({
      success: true,
      message: isLiked ? 'Post unliked' : 'Post liked',
      data: {
        likesCount: post.likesCount,
        isLiked: !isLiked
      }
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liking post'
    });
  }
};

// @desc    Share post
// @route   POST /api/posts/:id/share
// @access  Private
const sharePost = async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);

    if (!originalPost || !originalPost.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const { shareText } = req.body;

    const sharedPost = await Post.create({
      author: req.user._id,
      sharedPost: originalPost._id,
      shareText,
      visibility: 'public'
    });

    // Add to original post shares
    originalPost.shares.push({ user: req.user._id });
    await originalPost.save();

    // Create notification
    if (originalPost.author.toString() !== req.user._id.toString()) {
      await Notification.createNotification({
        recipient: originalPost.author,
        sender: req.user._id,
        type: 'share',
        entityType: 'post',
        entityId: originalPost._id,
        message: `${req.user.username} shared your post`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Post shared successfully',
      data: { sharedPost }
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sharing post'
    });
  }
};

// @desc    Get user's posts
// @route   GET /api/posts/user/:userId
// @access  Private/Public (depending on privacy)
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check privacy
    if (user.isPrivate && (!req.user || req.user._id.toString() !== userId)) {
      const isFollowing = await Follow.isFollowing(req.user?._id, user._id);
      if (!isFollowing) {
        return res.status(403).json({
          success: false,
          message: 'This account is private'
        });
      }
    }

    const posts = await Post.find({
      author: userId,
      isActive: true,
      visibility: req.user && req.user._id.toString() === userId ? { $exists: true } : 'public'
    })
      .populate('author', 'username firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Post.countDocuments({
      author: userId,
      isActive: true,
      visibility: req.user && req.user._id.toString() === userId ? { $exists: true } : 'public'
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting user posts'
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPopularPosts,
  getPost,
  updatePost,
  deletePost,
  likePost,
  sharePost,
  getUserPosts
};