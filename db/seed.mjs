// Seed: schema + curriculum (idempotent). Run: npm run db:seed
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_FILE ?? path.join(root, "..", "dev.db");
const db = new DatabaseSync(dbPath);
db.exec(readFileSync(path.join(root, "schema.sql"), "utf8"));

const lessons = JSON.parse(readFileSync(path.join(root, "seed-data", "lessons.json"), "utf8"));
if (lessons.length !== 84) throw new Error(`expected 84 lessons, got ${lessons.length}`);

const LEVELS = [
  ["A1", "Débutant", 1], ["A2", "Élémentaire", 2], ["B1", "Intermédiaire", 3],
  ["B2", "Avancé", 4], ["C1", "Autonome", 5],
];
// 14 modules of 6 lessons (matches game worlds); titles derived from range
const MODULES = Array.from({ length: 14 }, (_, i) => ({
  sort: i + 1, from: i * 6 + 1, to: i * 6 + 6,
}));

const BADGES = [
  ["first", "First Steps", "🌱", "Complete lesson 1"],
  ["streak7", "One Week Flame", "🔥", "7-day streak"],
  ["streak30", "Un Mois!", "🌋", "30-day streak"],
  ["l10", "Getting Serious", "📚", "10 lessons complete"],
  ["l42", "Halfway There", "⛰️", "42 lessons complete"],
  ["a1", "A1 Conquered", "🥉", "Finish all A1 lessons"],
  ["a2", "A2 Conquered", "🥈", "Finish all A2 lessons"],
  ["b1", "B1 Conquered", "🥇", "Finish all B1 lessons"],
  ["b2", "B2 Conquered", "🏆", "Finish all B2 lessons"],
  ["c1", "C1 Conquered", "👑", "Finish all C1 lessons"],
  ["perfect", "Flawless", "💎", "3 stars on any lesson"],
  ["coins500", "Little Banker", "🪙", "Hold 500 coins"],
];

const tx = db.prepare.bind(db);
db.exec("BEGIN");
try {
  const levelIds = {};
  for (const [code, title, sort] of LEVELS) {
    const existing = tx("SELECT id FROM levels WHERE code=?").get(code);
    const id = existing?.id ?? randomUUID();
    if (!existing) tx("INSERT INTO levels(id,code,title,sort) VALUES(?,?,?,?)").run(id, code, title, sort);
    levelIds[code] = id;
  }
  const moduleIds = [];
  for (const m of MODULES) {
    const lvl = lessons[m.from - 1].level; // level of first lesson in module
    const title = `Module ${m.sort} · Lessons ${m.from}–${m.to}`;
    const existing = tx("SELECT id FROM modules WHERE sort=?").get(m.sort);
    const id = existing?.id ?? randomUUID();
    if (!existing) tx("INSERT INTO modules(id,level_id,sort,title) VALUES(?,?,?,?)").run(id, levelIds[lvl], m.sort, title);
    moduleIds[m.sort] = id;
  }
  const insLesson = tx(`INSERT INTO lessons(id,module_id,sort,number,title,objective,grammar_title,grammar_body,grammar_examples,dialogue,video_query,writing_prompt)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insVocab = tx(`INSERT INTO vocab_items(id,lesson_id,idx,fr,en,pron,example_fr,example_en,example_pron) VALUES(?,?,?,?,?,?,?,?,?)`);
  for (const l of lessons) {
    if (tx("SELECT 1 FROM lessons WHERE number=?").get(l.number)) continue;
    const id = randomUUID();
    const moduleSort = Math.ceil(l.number / 6);
    insLesson.run(id, moduleIds[moduleSort], ((l.number - 1) % 6) + 1, l.number, l.title, l.objective,
      l.grammar.title, JSON.stringify(l.grammar.body), JSON.stringify(l.grammar.examples),
      JSON.stringify(l.dialogue), l.videoQuery, l.writingPrompt);
    for (const v of l.vocab)
      insVocab.run(randomUUID(), id, v.idx, v.fr, v.en, v.pron, v.exampleFr, v.exampleEn, v.examplePron);
  }
  for (const [code, title, emoji, rule] of BADGES) {
    if (!tx("SELECT 1 FROM badge_defs WHERE code=?").get(code))
      tx("INSERT INTO badge_defs(id,code,title,emoji,rule) VALUES(?,?,?,?,?)").run(randomUUID(), code, title, emoji, rule);
  }
  db.exec("COMMIT");
} catch (e) { db.exec("ROLLBACK"); throw e; }

const counts = {
  levels: db.prepare("SELECT COUNT(*) c FROM levels").get().c,
  modules: db.prepare("SELECT COUNT(*) c FROM modules").get().c,
  lessons: db.prepare("SELECT COUNT(*) c FROM lessons").get().c,
  vocab: db.prepare("SELECT COUNT(*) c FROM vocab_items").get().c,
  badges: db.prepare("SELECT COUNT(*) c FROM badge_defs").get().c,
};
console.log("Seed complete:", counts);
if (counts.lessons !== 84 || counts.vocab !== 672) { throw new Error("seed count mismatch"); }

// ===== Phase 5: rebuild full-text search index (idempotent) =====
db.exec("DELETE FROM search_index");
const insFts = db.prepare("INSERT INTO search_index(kind,ref,title,body) VALUES(?,?,?,?)");
db.exec("BEGIN");
try {
  const lessons = db.prepare(`SELECT number,title,objective,grammar_title,grammar_body,dialogue,writing_prompt FROM lessons ORDER BY number`).all();
  for (const l of lessons) {
    const body = [l.objective, l.grammar_title, JSON.parse(l.grammar_body).join(" "),
      JSON.parse(l.dialogue).lines.map(x => `${x.fr} ${x.en}`).join(" "), l.writing_prompt].join(" ");
    insFts.run("lesson", String(l.number), `Lesson ${l.number} · ${l.title}`, body);
  }
  const vocab = db.prepare(`SELECT v.fr,v.en,v.pron,v.example_fr,v.example_en,l.number FROM vocab_items v JOIN lessons l ON l.id=v.lesson_id`).all();
  for (const v of vocab)
    insFts.run("vocab", String(v.number), `${v.fr} — ${v.en}`, `${v.pron} ${v.example_fr} ${v.example_en}`);
  db.exec("COMMIT");
} catch (e) { db.exec("ROLLBACK"); throw e; }
console.log("Search index:", db.prepare("SELECT COUNT(*) c FROM search_index").get().c, "entries");
