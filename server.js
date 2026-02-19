const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

// Use default middlewares 
server.use(middlewares);

// Add custom routes if needed before the router
server.use(router);

// Render uses the PORT environment variable
const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`JSON Server is running on port ${PORT}`);
});