// Runs the production server + all four smoke suites. Usage: npm run build && node scripts/smoke-all.mjs
import { spawn, execFileSync } from "node:child_process";
const env = { ...process.env,
  DATABASE_FILE: process.cwd() + "/qa.db",
  NEXTAUTH_SECRET: "qa-4f8a2c9e7b1d6f3a",
  NEXTAUTH_URL: "http://localhost:3111" };
const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", "3111"], { env, stdio: "ignore" });
// wait for ready
for (let i = 0; i < 40; i++) {
  try { const r = await fetch("http://localhost:3111/login"); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 300));
}
let allOk = true;
for (const s of ["smoke.mjs", "smoke-phase2.mjs", "smoke-phase34.mjs", "smoke-phase56.mjs"]) {
  try {
    const out = execFileSync("node", ["scripts/" + s], { env, encoding: "utf8" });
    console.log(s, "→", out.trim().split("\n").pop());
  } catch (e) {
    allOk = false;
    console.log(s, "→ FAILED:", (e.stdout || "").split("\n").filter(Boolean).pop(), (e.stderr || "").split("\n").filter(Boolean).pop());
  }
}
server.kill("SIGKILL");
process.exit(allOk ? 0 : 1);
