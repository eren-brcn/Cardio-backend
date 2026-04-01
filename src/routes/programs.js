const express = require("express");
const WorkoutProgram = require("../models/WorkoutProgram");

const programRouter = express.Router();

// Create program (admin only, enforced in server.js)
programRouter.post("/", async (req, res) => {
  try {
    const { name, description, duration, difficulty, phases } = req.body;
    const createdBy = req.auth.userId;

    if (!name || !duration) {
      return res.status(400).json({ message: "name and duration are required" });
    }

    const program = await WorkoutProgram.create({
      name,
      description: description || "",
      duration,
      difficulty: difficulty || "intermediate",
      phases: phases || [],
      createdBy,
      assignedUsers: []
    });

    return res.status(201).json(program);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Get all programs
programRouter.get("/", async (_req, res) => {
  try {
    const programs = await WorkoutProgram.find()
      .populate("createdBy", "name email")
      .lean();

    return res.json(programs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get program details
programRouter.get("/:programId", async (req, res) => {
  try {
    const { programId } = req.params;
    const program = await WorkoutProgram.findById(programId)
      .populate("createdBy", "name email")
      .populate("assignedUsers", "name email");

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    return res.json(program);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Update program
programRouter.put("/:programId", async (req, res) => {
  try {
    const { programId } = req.params;
    const updates = req.body;

    const program = await WorkoutProgram.findByIdAndUpdate(programId, updates, { new: true });

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    return res.json(program);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Delete program
programRouter.delete("/:programId", async (req, res) => {
  try {
    const { programId } = req.params;
    const program = await WorkoutProgram.findByIdAndDelete(programId);

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    return res.json({ message: "Program deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Assign program to user
programRouter.post("/:programId/assign", async (req, res) => {
  try {
    const { programId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const program = await WorkoutProgram.findById(programId);

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    if (!program.assignedUsers.includes(userId)) {
      program.assignedUsers.push(userId);
      await program.save();
    }

    return res.json(program);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = programRouter;
