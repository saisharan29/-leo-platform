// Phase 3+4 smoke: tutor route honesty (503 no-key), plan lifecycle, calendar, reports, leaderboard.
const BASE = "http://localhost:3111";
const jar = new Map();
const ch = () => [...jar.entries()].map(([k,v])=>`${k}=${v}`).join("; ");
const sc = r => { for(const c of (r.headers.getSetCookie?.()??[])){const [kv]=c.split(";");const i=kv.indexOf("=");jar.set(kv.slice(0,i),kv.slice(i+1));} };
async function req(p,o={}){const r=await fetch(BASE+p,{redirect:"manual",...o,headers:{cookie:ch(),...(o.headers??{})}});sc(r);return r;}
const fail = m => { console.error("FAIL:", m); process.exit(1); };
const j = { "content-type": "application/json" };

const email=`p34-${Date.now()}@t.dev`;
let r = await req("/api/auth/register",{method:"POST",headers:j,body:JSON.stringify({displayName:"P34 Fox",email,password:"hunter2secure"})});
if(r.status!==201) fail("register "+r.status);
r = await req("/api/auth/csrf"); const {csrfToken} = await r.json();
await req("/api/auth/callback/credentials",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({csrfToken,email,password:"hunter2secure",json:"true"})});

// AI tutor: without a key the route must be honest, not fake
r = await req("/api/ai/chat",{method:"POST",headers:j,body:JSON.stringify({mode:"chat",messages:[{role:"user",content:"Bonjour"}]})});
if(process.env.ANTHROPIC_API_KEY){ if(r.status!==200) fail("ai chat with key "+r.status); console.log("ai chat OK (live)"); }
else { if(r.status!==503) fail("ai chat should 503 without key, got "+r.status); console.log("ai chat OK: honest 503 without key"); }
// bad payload → 400
r = await req("/api/ai/chat",{method:"POST",headers:j,body:JSON.stringify({mode:"nope",messages:[]})});
if(r.status!==400) fail("ai chat validation expected 400, got "+r.status);
console.log("ai chat validation OK");

// plan: generate today
r = await req("/api/plan"); const plan = await r.json();
if(r.status!==200 || !Array.isArray(plan.tasks) || plan.tasks.length<1) fail("plan: "+JSON.stringify(plan).slice(0,150));
if(plan.tasks[0].kind!=="lesson") fail("fresh user first task should be lesson, got "+plan.tasks[0].kind);
console.log("plan generated OK:", plan.tasks.map(t=>t.kind).join(","));
// idempotent
r = await req("/api/plan"); const plan2 = await r.json();
if(plan2.tasks.length!==plan.tasks.length) fail("plan not idempotent");
// task status
r = await req("/api/plan/task",{method:"PATCH",headers:j,body:JSON.stringify({taskId:plan.tasks[0].id,status:"done"})});
if(r.status!==200) fail("task patch "+r.status);
r = await req("/api/plan"); if((await r.json()).tasks[0].status!=="done") fail("status not persisted");
console.log("task status OK");
// invalid status → 400
r = await req("/api/plan/task",{method:"PATCH",headers:j,body:JSON.stringify({taskId:plan.tasks[0].id,status:"nah"})});
if(r.status!==400) fail("invalid status expected 400, got "+r.status);

// calendar month + heatmap year
const today = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris"}).format(new Date());
r = await req(`/api/calendar?month=${today.slice(0,7)}`); const mon = await r.json();
if(r.status!==200 || !mon.days.find(d=>d.date===today)) fail("calendar month: "+JSON.stringify(mon).slice(0,120));
r = await req(`/api/calendar?year=${today.slice(0,4)}`);
if(r.status!==200) fail("calendar year "+r.status);
console.log("calendar OK");

// complete a lesson so reports have data
r = await req("/api/lessons/1/exercises?seed=3"); const ex = await r.json();
const answers = ex.questions.slice(0,30).map(q=>({qType:q.type,skill:q.skill,correct:true}));
await req("/api/progress/lesson",{method:"POST",headers:j,body:JSON.stringify({lessonNumber:1,accuracy:100,answers})});
r = await req("/api/reports?range=week"); const rep = await r.json();
if(r.status!==200 || rep.totals.xp<1 || rep.totals.lessons<1) fail("report: "+JSON.stringify(rep.totals));
if(!rep.skills.length) fail("report skills empty");
console.log("reports OK: xp", rep.totals.xp, "· lessons", rep.totals.lessons, "· skills", rep.skills.length);

// leaderboard opt-in flow
r = await req("/api/leaderboard"); let lb = await r.json();
if(lb.entries.some(e=>e.name==="P34 Fox")) fail("should not be on board before opt-in");
r = await req("/api/me",{method:"PATCH",headers:j,body:JSON.stringify({leaderboardOptIn:true})});
if(r.status!==200) fail("opt-in patch "+r.status);
r = await req("/api/leaderboard"); lb = await r.json();
if(!lb.entries.some(e=>e.name==="P34 Fox")) fail("should be on board after opt-in: "+JSON.stringify(lb).slice(0,150));
console.log("leaderboard opt-in OK");

// pages render
for (const p of ["/tutor","/plan","/reports"]) { r = await req(p); if(r.status!==200) fail(p+" → "+r.status); }
console.log("tutor/plan/reports pages render OK");
console.log("\nPHASE 3+4 SMOKE PASSED");
