require("dotenv").config();

const path = require("path");
const { execSync, spawn } = require("child_process");

const port = Number(process.env.PORT || 10001);

function freePortWindows(targetPort) {
  try {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });

    const pids = [...new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => line.includes("LISTENING"))
        .map((line) => line.split(/\s+/).pop())
        .filter(Boolean)
    )];

    for (const pid of pids) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`Stopped process ${pid} on port ${targetPort}`);
    }
  } catch {
    // No process is listening on the configured port.
  }
}

if (process.platform === "win32") {
  freePortWindows(port);
}

const nodemonScript = path.join(
  __dirname,
  "..",
  "node_modules",
  "nodemon",
  "bin",
  "nodemon.js"
);

const child = spawn(process.execPath, [nodemonScript, "src/server.js"], {
  stdio: "inherit",
  shell: false,
  env: process.env
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error(err.message);
  process.exit(1);
});