// Phase 2 smoke: run after scripts/smoke.mjs against the same server.
// Phase 2 smoke additions: SRS queue/review, practice material+log, placement, badges
const BASE = "http://localhost:3111";
const jar = new Map();
const ch = () => [...jar.entries()].map(([k,v])=>`${k}=${v}`).join("; ");
const sc = r => { for(const c of (r.headers.getSetCookie?.()??[])){const [kv]=c.split(";");const i=kv.indexOf("=");jar.set(kv.slice(0,i),kv.slice(i+1));} };
async function req(p,o={}){const r=await fetch(BASE+p,{redirect:"manual",...o,headers:{cookie:ch(),...(o.headers??{})}});sc(r);return r;}
const fail = m => { console.error("FAIL:", m); process.exit(1); };
const email=`p2-${Date.now()}@t.dev`;
let r = await req("/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({displayName:"P2 Fox",email,password:"hunter2secure"})});
if(r.status!==201) fail("register "+r.status);
r = await req("/api/auth/csrf"); const {csrfToken} = await r.json();
await req("/api/auth/callback/credentials",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({csrfToken,email,password:"hunter2secure",json:"true"})});

// complete lesson 1 → seeds SRS cards + badges
r = await req("/api/lessons/1/exercises?seed=7"); const ex = await r.json();
const answers = ex.questions.slice(0,30).map(q=>({qType:q.type,skill:q.skill,correct:true}));
r = await req("/api/progress/lesson",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({lessonNumber:1,accuracy:100,answers})});
const done = await r.json();
if(done.stars!==3) fail("3 stars expected: "+JSON.stringify(done));
if(!Array.isArray(done.newBadges)) fail("newBadges missing from completion payload");
const codes = done.newBadges.map(b=>b.code);
if(!codes.includes("first")||!codes.includes("perfect")) fail("expected first+perfect badges, got "+JSON.stringify(codes));
console.log("badges on completion OK:", codes.join(","));

// SRS queue has lesson-1 vocab due
r = await req("/api/srs/queue"); const q = await r.json();
if(r.status!==200 || !Array.isArray(q.cards) || q.cards.length < 1) fail("srs queue: "+r.status+" "+JSON.stringify(q).slice(0,120));
console.log("srs queue OK:", q.cards.length, "cards due");

// review one card
const card = q.cards[0];
r = await req("/api/srs/review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({cardId:card.id,grade:"good"})});
const rev = await r.json();
if(r.status!==200 || rev.ok!==true || typeof rev.due!=="number") fail("srs review: "+r.status+" "+JSON.stringify(rev).slice(0,120));
console.log("srs review OK: remaining due", rev.due, "of", rev.total);

// practice material + log
r = await req("/api/practice/material?kind=dictation&count=3"); const mat = await r.json();
if(r.status!==200 || !Array.isArray(mat.items) || mat.items.length<1) fail("material: "+JSON.stringify(mat).slice(0,150));
console.log("practice material OK:", mat.items.length, "items");
r = await req("/api/practice/log",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"dictation",xp:10,answers:[{qType:"type",skill:"listening",correct:true},{qType:"type",skill:"listening",correct:false}]})});
if(r.status!==200) fail("practice log "+r.status);
console.log("practice log OK");

// placement: submit strong A1/A2, weak B1 → unlock through lesson 37
r = await req("/api/placement",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scores:[{level:"A1",correct:6,answered:6},{level:"A2",correct:5,answered:6},{level:"B1",correct:2,answered:6},{level:"B2",correct:0,answered:4},{level:"C1",correct:0,answered:4}]})});
const pl = await r.json();
if(r.status!==200 || pl.startLesson!==37) fail("placement: "+JSON.stringify(pl));
r = await req("/api/lessons/30/exercises");
if(r.status!==200) fail("lesson 30 should be unlocked after placement, got "+r.status);
console.log("placement OK: start lesson", pl.startLesson, "· mid-band lesson accessible");

// badges list endpoint
r = await req("/api/badges"); const b = await r.json();
if(r.status!==200 || !Array.isArray(b.badges) || !b.badges.some(x=>x.earned_at)) fail("badges list: "+JSON.stringify(b).slice(0,150));
console.log("badges list OK:", b.badges.filter(x=>x.earned_at).length, "earned /", b.badges.length);

// practice pages render
for (const p of ["/practice","/practice/review","/practice/dictation","/practice/conjugation","/practice/numbers","/practice/arcade","/placement"]) {
  r = await req(p); if(r.status!==200) fail(p+" → "+r.status);
}
console.log("all practice pages render OK");
console.log("\nPHASE 2 SMOKE PASSED");
