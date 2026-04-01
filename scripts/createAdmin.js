/**
 * Creates an admin user in the database.
 *
 * Usage:
 *   node scripts/createAdmin.js <email> <password> <name>
 *
 * Example:
 *   node scripts/createAdmin.js admin@cardioweb.com MySecret123 "Admin User"
 */

require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../src/models/User");

const [, , email, password, name = "Admin"] = process.argv;

if (!email || !password) {
  console.error("Usage: node scripts/createAdmin.js <email> <password> [name]");
  process.exit(1);
}

if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("MONGODB_URI is not set in .env");
  process.exit(1);
}

(async () => {
  await mongoose.connect(mongoUri);

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    if (existing.role === "admin") {
      console.log(`Admin already exists: ${existing.email}`);
    } else {
      existing.role = "admin";
      await existing.save();
      console.log(`Upgraded existing user to admin: ${existing.email}`);
    }
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: String(name).trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "admin"
  });

  console.log(`Admin created successfully:`);
  console.log(`  Email : ${user.email}`);
  console.log(`  Name  : ${user.name}`);
  console.log(`  Role  : ${user.role}`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
