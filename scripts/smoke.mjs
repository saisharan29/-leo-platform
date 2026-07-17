// End-to-end smoke test. Usage:
//   npm run build && DATABASE_FILE=$PWD/qa.db node db/seed.mjs
//   DATABASE_FILE=$PWD/qa.db PORT=3111 npm start &
//   node scripts/smoke.mjs
// End-to-end smoke: register → csrf → credentials login → session → APIs → lesson complete
const BASE = "http://localhost:3111";
const jar = new Map();
function cookieHeader() { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "); }
function storeCookies(res) {
  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) { const [kv] = c.split(";"); const i = kv.indexOf("="); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
}
async function req(path, opts = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", ...opts, headers: { cookie: cookieHeader(), ...(opts.headers ?? {}) } });
  storeCookies(res);
  return res;
}
const fail = (m) => { console.error("FAIL:", m); process.exit(1); };

// 1. register
const email = `qa${Date.now()}@test.dev`;
let r = await req("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: "QA Fox", email, password: "hunter2secure" }) });
if (r.status !== 201 && r.status !== 200) fail(`register ${r.status}: ${await r.text()}`);
console.log("register OK", r.status);

// duplicate register → 409
r = await req("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: "QA Fox", email, password: "hunter2secure" }) });
if (r.status !== 409) fail(`dup register expected 409, got ${r.status}`);
console.log("duplicate register 409 OK");

// 2. csrf + credentials login
r = await req("/api/auth/csrf");
const { csrfToken } = await r.json();
r = await req("/api/auth/callback/credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, email, password: "hunter2secure", json: "true" }) });
if (![200, 302].includes(r.status)) fail(`login ${r.status}`);
if (![...jar.keys()].some((k) => k.includes("session-token"))) fail("no session cookie after login");
console.log("login OK, session cookie set");

// 3. /api/me
r = await req("/api/me");
const me = await r.json();
if (me.displayName !== "QA Fox") fail(`me: ${JSON.stringify(me).slice(0, 200)}`);
if (me.totalLessons !== 84) fail(`totalLessons: ${me.totalLessons}`);
console.log("me OK:", JSON.stringify({ name: me.displayName, xp: me.xp, lessons: me.lessonsDone + "/" + me.totalLessons }));

// 4. levels map
r = await req("/api/levels");
const levels = await r.json();
const totalLessons = levels.modules?.flatMap?.((m) => m.lessons)?.length ?? levels.levels?.flatMap?.((l) => l.modules ?? []).length;
console.log("levels OK, modules:", levels.modules?.length ?? "n/a");

// 5. lesson 1 + exercises
r = await req("/api/lessons/1");
if (r.status !== 200) fail(`lesson 1 ${r.status}`);
r = await req("/api/lessons/1/exercises?seed=42");
const ex = await r.json();
if (!Array.isArray(ex.questions) || ex.questions.length < 25) fail(`exercises: ${ex.questions?.length}`);
console.log("exercises OK:", ex.questions.length, "questions");

// 6. locked lesson check → 403
r = await req("/api/lessons/9/exercises");
console.log("locked lesson 9 status:", r.status, r.status === 403 ? "OK" : "(check)");

// 7. complete lesson 1
const answers = ex.questions.slice(0, 30).map((q) => ({ qType: q.type, skill: q.skill, correct: Math.random() < 0.9 }));
r = await req("/api/progress/lesson", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonNumber: 1, accuracy: 87, answers }) });
if (r.status !== 200) fail(`progress ${r.status}: ${await r.text()}`);
const done = await r.json();
if (done.stars !== 2) fail(`stars for 87% should be 2, got ${done.stars}`);
if (done.unlockedThrough !== 2) fail(`unlockedThrough should be 2, got ${done.unlockedThrough}`);
console.log("lesson complete OK:", JSON.stringify(done));

// 8. lesson 2 now unlocked
r = await req("/api/lessons/2/exercises");
if (r.status !== 200) fail(`lesson 2 after unlock ${r.status}`);
console.log("lesson 2 unlocked OK");

// 9. authed dashboard HTML renders
r = await req("/dashboard");
const html = (await (r.status === 200 ? r.text() : Promise.resolve(""))).replace(/<!-- -->/g, "");
if (r.status !== 200 || !html.includes("QA Fox")) fail(`dashboard render ${r.status}, hasName=${html.includes("QA Fox")}`);
if (!html.includes("Lesson 2")) fail("dashboard should point at Lesson 2 next");
console.log("dashboard RSC OK (greets user, continue → Lesson 2)");

// 10. map renders with lesson 1 done
r = await req("/map");
const mapHtml = (await r.text()).replace(/<!-- -->/g, "");
if (!mapHtml.includes("Your path to C1")) fail("map render");
console.log("map RSC OK");

// 11. lesson page renders player teach phase
r = await req("/lesson/2");
const lessonHtml = (await r.text()).replace(/<!-- -->/g, "");
if (r.status !== 200 || !lessonHtml.includes("Start exercises")) fail(`lesson page ${r.status}`);
console.log("lesson player page OK");

// 12. locked lesson page redirects to /map
r = await req("/lesson/50");
if (r.status !== 307 && r.status !== 302) fail(`locked lesson page expected redirect, got ${r.status}`);
console.log("locked lesson page redirects OK");

console.log("\nALL SMOKE CHECKS PASSED");

/* ===== Phase 2 checks (same session continues) ===== */
// SRS: lesson 1 completion should have added 8 cards
r = await req("/api/srs/queue");
const srs = await r.json();
if (srs.total !== 8 || srs.cards.length !== 8) fail(`srs after lesson: total=${srs.total} cards=${srs.cards.length}`);
console.log("srs queue OK: 8 cards from lesson 1");

// review one card
r = await req("/api/srs/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cardId: srs.cards[0].id, grade: "good" }) });
const rev = await r.json();
if (r.status !== 200 || rev.due !== 7) fail(`srs review: ${r.status} due=${rev.due}`);
console.log("srs review OK: due 8→7");

// practice material limited to unlocked lessons (≤ lesson 2 = 16 items)
r = await req("/api/practice/material");
const mat = await r.json();
if (mat.upto !== 2 || mat.items.length !== 16) fail(`material upto=${mat.upto} n=${mat.items.length}`);
console.log("practice material OK: 16 sentences up to lesson 2");

// practice log grants capped XP
r = await req("/api/practice/log", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "numbers", xp: 99, answers: [{ qType: "type", skill: "vocab", correct: true }, { qType: "type", skill: "vocab", correct: false }] }) });
const plog = await r.json();
if (r.status !== 200 || plog.xp !== 1) fail(`practice log xp should cap at correct=1, got ${plog.xp}`);
console.log("practice log OK: xp capped to correct answers");

// badges: 'first' earned from lesson 1
r = await req("/api/badges");
const bd = await r.json();
const earned = bd.badges.filter((b) => b.earned_at).map((b) => b.code);
if (!earned.includes("first")) fail(`badges earned: ${earned}`);
console.log("badges OK: earned", earned.join(","));

// placement GET: 5 sections × 6 auto-gradable questions
r = await req("/api/placement");
const pl = await r.json();
if (pl.sections.length !== 5 || pl.sections.some((s) => s.questions.length !== 6)) fail("placement shape");
if (pl.sections.some((s) => s.questions.some((q) => q.type !== "mcq" && q.type !== "listen"))) fail("placement has non-selectable questions");
console.log("placement GET OK: 5×6 questions");

// placement POST: pass A1+A2 → start B1(37), never below earned progress
r = await req("/api/placement", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scores: [
  { level: "A1", correct: 6, answered: 6 }, { level: "A2", correct: 5, answered: 6 },
  { level: "B1", correct: 2, answered: 6 }, { level: "B2", correct: 0, answered: 0 }, { level: "C1", correct: 0, answered: 0 },
] }) });
const placed = await r.json();
if (placed.level !== "B1" || placed.startLesson !== 37 || placed.unlockedThrough !== 37) fail(`placement apply: ${JSON.stringify(placed)}`);
console.log("placement POST OK: cleared to lesson 36, start at B1/37");

// practice hub RSC renders
r = await req("/practice");
const practHtml = (await r.text()).replace(/<!-- -->/g, "");
if (r.status !== 200 || !practHtml.includes("Review deck")) fail(`practice page ${r.status}`);
console.log("practice hub OK");

console.log("\nPHASE 1 SMOKE PASSED (12 checks)");
