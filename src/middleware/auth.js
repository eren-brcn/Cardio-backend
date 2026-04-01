const jwt = require("jsonwebtoken");

const getJwtSecret = () => process.env.JWT_SECRET || "dev-only-change-me";

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid authorization token" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.auth = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireSelfOrAdmin = (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const isAdmin = req.auth.role === "admin";
  const isSelf = req.auth.userId === req.params.userId;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
};

module.exports = {
  requireAuth,
  requireSelfOrAdmin
};
