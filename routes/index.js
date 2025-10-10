const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const postRoutes = require('./posts');
const commentRoutes = require('./comments');
const followRoutes = require('./follow');
const notificationRoutes = require('./notifications');

// Mount routes
router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/follow', followRoutes);
router.use('/notifications', notificationRoutes);

// API info route
router.get('/', (req, res) => {
  res.json({
    message: 'Social Media API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      posts: '/api/posts',
      comments: '/api/comments',
      follow: '/api/follow',
      notifications: '/api/notifications'
    }
  });
});

module.exports = router;