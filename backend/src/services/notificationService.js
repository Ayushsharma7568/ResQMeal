import Notification from '../models/Notification.js';

/**
 * Creates a notification for a recipient while preventing unnecessary duplicates.
 */
export const sendNotification = async ({
  recipientId,
  type,
  title,
  message,
  relatedEntityType,
  relatedEntityId
}) => {
  try {
    if (!recipientId) return null;

    // Prevent duplicate unread notifications for same recipient & event entity
    if (relatedEntityId && relatedEntityType) {
      const existing = await Notification.findOne({
        recipientId,
        type,
        relatedEntityType,
        relatedEntityId,
        read: false
      });
      if (existing) {
        return existing; // Avoid duplicate unread notification
      }
    }

    const notification = await Notification.create({
      recipientId,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId
    });

    return notification;
  } catch (error) {
    console.error('Send notification error:', error);
    return null;
  }
};
