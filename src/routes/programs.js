const express = require("express");
const WorkoutProgram = require("../models/WorkoutProgram");

const programRouter = express.Router();

const ownsProgram = (program, userId) => String(program.createdBy) === String(userId);

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

programRouter.get("/", async (req, res) => {
  try {
    const programs = await WorkoutProgram.find({ createdBy: req.auth.userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(programs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

programRouter.get("/:programId", async (req, res) => {
  try {
    const { programId } = req.params;
    const program = await WorkoutProgram.findById(programId);

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    if (!ownsProgram(program, req.auth.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(program);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

programRouter.put("/:programId", async (req, res) => {
  try {
    const { programId } = req.params;
    const updates = {
      name: req.body.name,
      description: req.body.description,
      duration: req.body.duration,
      difficulty: req.body.difficulty,
      phases: req.body.phases
    };

    const program = await WorkoutProgram.findById(programId);

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    if (!ownsProgram(program, req.auth.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        program[key] = value;
      }
    });

    await program.save();

    return res.json(program);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

programRouter.delete("/:programId", async (req, res) => {
  try {
    const { programId } = req.params;
    const program = await WorkoutProgram.findById(programId);

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    if (!ownsProgram(program, req.auth.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await program.deleteOne();

    return res.json({ message: "Program deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = programRouter;
