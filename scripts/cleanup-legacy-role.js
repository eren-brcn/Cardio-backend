require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/User");

async function run() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("MONGODB_URI is missing. Aborting cleanup.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");

    const result = await User.collection.updateMany(
      { role: { $exists: true } },
      { $unset: { role: "" } }
    );

    console.log(
      `Legacy role cleanup done. matched=${result.matchedCount || 0}, modified=${result.modifiedCount || 0}`
    );
  } catch (error) {
    console.error("Cleanup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

run();
