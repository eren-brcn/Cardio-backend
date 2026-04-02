const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:10001";

async function check(name, fn) {
  try {
    const detail = await fn();
    return { name, ok: true, detail };
  } catch (error) {
    return { name, ok: false, detail: error.message };
  }
}

async function run() {
  const checks = [];

  checks.push(
    await check("health", async () => {
      const res = await fetch(`${baseUrl}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return body.status || "ok";
    })
  );

  checks.push(
    await check("metrics", async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return `requests=${body?.requests?.totalRequests ?? 0}`;
    })
  );

  checks.push(
    await check("public leaderboard", async () => {
      const res = await fetch(`${baseUrl}/social/leaderboard/weight`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const count = Array.isArray(body) ? body.length : 0;
      return `count=${count}`;
    })
  );

  const failed = checks.filter((c) => !c.ok);
  checks.forEach((c) => {
    const flag = c.ok ? "PASS" : "FAIL";
    console.log(`[${flag}] ${c.name} -> ${c.detail}`);
  });

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run();
