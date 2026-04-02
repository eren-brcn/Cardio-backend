const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const notificationsRouter = express.Router();

// Simple in-app notification preferences
notificationsRouter.get("/preferences", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      notificationsEnabled: user.notificationsEnabled !== false,
      reminderFrequency: user.reminderFrequency || "weekly"
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

notificationsRouter.put("/preferences", requireAuth, async (req, res) => {
  try {
    const { notificationsEnabled, reminderFrequency } = req.body;
    const user = await User.findByIdAndUpdate(
      req.auth.userId,
      {
        notificationsEnabled: notificationsEnabled !== false,
        reminderFrequency: reminderFrequency || "weekly"
      },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Preferences updated",
      notificationsEnabled: user.notificationsEnabled,
      reminderFrequency: user.reminderFrequency
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Get unread notifications count
notificationsRouter.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const unreadCount = (user.notifications || []).filter((n) => !n.read).length;

    return res.json({ unreadCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get notifications
notificationsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notifications = (user.notifications || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    return res.json(notifications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
notificationsRouter.put("/:notificationId/read", requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notification = user.notifications?.find(
      (n) => String(n._id) === notificationId
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    await user.save();

    return res.json(notification);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Clear all notifications
notificationsRouter.delete("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.notifications = [];
    await user.save();

    return res.json({ message: "All notifications cleared" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = notificationsRouter;
