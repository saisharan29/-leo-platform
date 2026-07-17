// Phase 5+6 smoke: notes, bookmarks, search, admin gating + editing, PWA assets.
const BASE = "http://localhost:3111";
const jar = new Map();
const ch = () => [...jar.entries()].map(([k,v])=>`${k}=${v}`).join("; ");
const sc = r => { for(const c of (r.headers.getSetCookie?.()??[])){const [kv]=c.split(";");const i=kv.indexOf("=");jar.set(kv.slice(0,i),kv.slice(i+1));} };
async function req(p,o={}){const r=await fetch(BASE+p,{redirect:"manual",...o,headers:{cookie:ch(),...(o.headers??{})}});sc(r);return r;}
const fail = m => { console.error("FAIL:", m); process.exit(1); };
const j = { "content-type": "application/json" };

const email=`p56-${Date.now()}@t.dev`;
let r = await req("/api/auth/register",{method:"POST",headers:j,body:JSON.stringify({displayName:"P56 Fox",email,password:"hunter2secure"})});
if(r.status!==201) fail("register "+r.status);
r = await req("/api/auth/csrf"); const {csrfToken}=await r.json();
await req("/api/auth/callback/credentials",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({csrfToken,email,password:"hunter2secure",json:"true"})});

// notes + bookmarks
r = await req("/api/notes",{method:"PUT",headers:j,body:JSON.stringify({lessonNumber:1,body:"gender of nouns!!"})});
if(r.status!==200) fail("note put "+r.status);
r = await req("/api/notes?lesson=1"); if((await r.json()).note?.body!=="gender of nouns!!") fail("note read");
r = await req("/api/bookmarks",{method:"POST",headers:j,body:JSON.stringify({lessonNumber:1})});
if((await r.json()).bookmarked!==true) fail("bookmark on");
console.log("notes + bookmarks OK");

// search
r = await req("/api/search?q=bonjour"); const s1 = await r.json();
if(!s1.hits.length) fail("search bonjour empty");
r = await req("/api/search?q=cafe"); if(!(await r.json()).hits.length) fail("diacritics search");
r = await req(`/api/search?q=${encodeURIComponent('"*^')}`); if(r.status!==200) fail("hostile query "+r.status);
console.log("search OK:", s1.hits.length, "hits for bonjour");

// admin: forbidden as user
r = await req("/api/admin/content",{method:"POST",headers:j,body:JSON.stringify({op:"lesson",lessonNumber:1,title:"X"})});
if(r.status!==403) fail("admin should 403 for user, got "+r.status);
r = await req("/api/admin/lesson?number=1"); if(r.status!==403) fail("admin GET should 403");
console.log("admin gate OK (403 for regular user)");

// grant admin via script, then edit + verify search reindex
const { execSync } = await import("node:child_process");
execSync(`node scripts/make-admin.mjs ${email}`, { env: { ...process.env, DATABASE_FILE: process.env.DATABASE_FILE } });
r = await req("/api/admin/lesson?number=2"); if(r.status!==200) fail("admin GET after grant "+r.status);
r = await req("/api/admin/content",{method:"POST",headers:j,body:JSON.stringify({op:"lesson",lessonNumber:2,title:"Xylophone Lesson"})});
if(r.status!==200) fail("admin lesson edit "+r.status);
r = await req("/api/search?q=xylophone"); if(!(await r.json()).hits.length) fail("edit did not reindex");
await req("/api/admin/content",{method:"POST",headers:j,body:JSON.stringify({op:"lesson",lessonNumber:2,title:"The Alphabet & Pronunciation Rules"})});
// video add/remove
r = await req("/api/admin/content",{method:"POST",headers:j,body:JSON.stringify({op:"video_add",lessonNumber:1,title:"Greetings",youtubeId:"abc123XYZ"})});
const vid = (await r.json()).id; if(!vid) fail("video add");
r = await req("/api/admin/content",{method:"POST",headers:j,body:JSON.stringify({op:"video_del",id:vid})});
if(r.status!==200) fail("video del");
console.log("admin editing + search reindex + videos OK");

// PWA assets
r = await req("/manifest.webmanifest"); const man = await r.json();
if(r.status!==200 || man.name !== "Léo — Learn French") fail("manifest");
r = await req("/sw.js"); if(r.status!==200 || !(await r.text()).includes("CACHE_LESSON")) fail("sw.js");
r = await req("/icons/icon-192.png"); if(r.status!==200) fail("icon 192");
r = await req("/offline"); if(r.status!==200) fail("offline page "+r.status);
console.log("PWA assets OK (manifest, sw, icons, offline page)");

// pages render
for (const p of ["/search","/saved","/admin"]) { r = await req(p); if(r.status!==200) fail(p+" → "+r.status); }
console.log("search/saved/admin pages render OK");
console.log("\nPHASE 5+6 SMOKE PASSED");
