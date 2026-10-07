import Notification from '../models/Notification.js';

// ─────────────────────────────────────────────
// GET /api/notifications — Get authenticated user's notifications
// ─────────────────────────────────────────────
export const getMyNotifications = async (req, res) => {
  try {
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const filter = { recipientId: req.user._id };
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientId: req.user._id, read: false })
    ]);

    res.status(200).json({
      status: 'success',
      results: notifications.length,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total
      },
      data: { notifications }
    });
  } catch (error) {
    console.error('Get my notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching notifications'
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/notifications/:id/read — Mark single notification as read
// ─────────────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid notification ID format'
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipientId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating notification'
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/notifications/read-all — Mark all notifications as read
// ─────────────────────────────────────────────
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating notifications'
    });
  }
};
