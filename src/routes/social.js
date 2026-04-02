const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const socialRouter = express.Router();

socialRouter.get("/me/following-ids", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).select("following").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const followingIds = (user.following || []).map((id) => String(id));
    return res.json({ followingIds });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Follow a user
socialRouter.post("/:userId/follow", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.auth.userId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const targetUser = await User.findById(userId);
    const currentUser = await User.findById(req.auth.userId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add to current user's following list
    if (!currentUser.following.includes(userId)) {
      currentUser.following.push(userId);
    }

    // Add to target user's followers list
    if (!targetUser.followers.includes(req.auth.userId)) {
      targetUser.followers.push(req.auth.userId);
    }

    // Save both sides so follow/follower counts stay consistent.
    await currentUser.save();
    await targetUser.save();

    return res.json({ message: "Successfully followed user" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Unfollow a user
socialRouter.post("/:userId/unfollow", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findById(userId);
    const currentUser = await User.findById(req.auth.userId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove from current user's following list
    currentUser.following = currentUser.following.filter(
      (id) => String(id) !== userId
    );

    // Remove from target user's followers list
    targetUser.followers = targetUser.followers.filter(
      (id) => String(id) !== req.auth.userId
    );

    await currentUser.save();
    await targetUser.save();

    return res.json({ message: "Successfully unfollowed user" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Get leaderboard (most total weight lifted)
socialRouter.get("/leaderboard/weight", async (req, res) => {
  try {
    const users = await User.find({ isPublic: true })
      .select("name workouts followers")
      .lean()
      .limit(50);

    const leaderboard = users
      .map((user) => {
        const totalWeight = (user.workouts || []).reduce(
          (sum, w) => sum + (w.currentWeight || 0),
          0
        );
        return {
          id: user._id,
          name: user.name,
          totalWeight,
          followersCount: (user.followers || []).length
        };
      })
      // Rank in memory after projection so we sort by computed totals.
      .sort((a, b) => b.totalWeight - a.totalWeight);

    return res.json(leaderboard);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get leaderboard (most workouts)
socialRouter.get("/leaderboard/workouts", async (req, res) => {
  try {
    const users = await User.find({ isPublic: true })
      .select("name workouts followers")
      .lean()
      .limit(50);

    const leaderboard = users
      .map((user) => ({
        id: user._id,
        name: user.name,
        workoutCount: (user.workouts || []).length,
        followersCount: (user.followers || []).length
      }))
      .sort((a, b) => b.workoutCount - a.workoutCount);

    return res.json(leaderboard);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get user's following list
socialRouter.get("/:userId/following", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate("following", "name bio isPublic")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user.following || []);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get user's followers list
socialRouter.get("/:userId/followers", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate("followers", "name bio isPublic")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user.followers || []);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Update profile (bio + privacy)
socialRouter.put("/me/profile", requireAuth, async (req, res) => {
  try {
    const { bio, isPublic } = req.body;

    const updates = {};
    if (bio !== undefined) {
      updates.bio = String(bio || "").trim().slice(0, 200);
    }
    if (isPublic !== undefined) {
      updates.isPublic = Boolean(isPublic);
    }

    const user = await User.findByIdAndUpdate(req.auth.userId, updates, { new: true })
      .select("name bio isPublic email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Get public user profile
socialRouter.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select("name bio email isPublic createdAt followers following workouts goals")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isPublic) {
      return res.status(403).json({ message: "This profile is private" });
    }

    const totalWeight = (user.workouts || []).reduce((sum, w) => sum + (w.currentWeight || 0), 0);
    const workoutCount = (user.workouts || []).length;
    const followersCount = (user.followers || []).length;
    const followingCount = (user.following || []).length;
    const completedGoals = (user.goals || []).filter((g) => g.completed).length;

    return res.json({
      id: user._id,
      name: user.name,
      bio: user.bio,
      email: user.email,
      isPublic: user.isPublic,
      createdAt: user.createdAt,
      stats: {
        totalWeight,
        workoutCount,
        followersCount,
        followingCount,
        completedGoals
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = socialRouter;
