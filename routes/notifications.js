const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats
} = require('../controllers/notificationController');

const { protect } = require('../middleware/auth');
const { validatePagination, validateObjectId } = require('../middleware/validation');

const router = express.Router();

// All notification routes require authentication
router.use(protect);

router.get('/', validatePagination, getNotifications);
router.get('/stats', getNotificationStats);

router.put('/:id/read', validateObjectId('id'), markAsRead);
router.put('/read-all', markAllAsRead);

router.delete('/:id', validateObjectId('id'), deleteNotification);

module.exports = router;