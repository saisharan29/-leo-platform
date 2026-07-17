import { db } from "../db";
import type { LessonContent } from "@/lib/engine/types";

interface LessonRow {
  id: string; number: number; title: string; objective: string;
  grammar_title: string; grammar_body: string; grammar_examples: string;
  dialogue: string; video_query: string; writing_prompt: string; module_id: string;
}

export interface MapLesson { number: number; title: string }
export interface MapModule { sort: number; title: string; level: string; lessons: MapLesson[] }

export const curriculumRepo = {
  mapTree(): MapModule[] {
    const rows = db.prepare(`
      SELECT m.sort as msort, m.title as mtitle, lv.code as level, l.number, l.title
      FROM modules m JOIN levels lv ON lv.id=m.level_id
      JOIN lessons l ON l.module_id=m.id
      ORDER BY m.sort, l.sort`).all() as { msort: number; mtitle: string; level: string; number: number; title: string }[];
    const mods = new Map<number, MapModule>();
    for (const r of rows) {
      if (!mods.has(r.msort)) mods.set(r.msort, { sort: r.msort, title: r.mtitle, level: r.level, lessons: [] });
      mods.get(r.msort)!.lessons.push({ number: r.number, title: r.title });
    }
    return [...mods.values()];
  },

  lessonByNumber(number: number): LessonContent | undefined {
    const r = db.prepare("SELECT l.*, lv.code as level FROM lessons l JOIN modules m ON m.id=l.module_id JOIN levels lv ON lv.id=m.level_id WHERE l.number=?")
      .get(number) as (LessonRow & { level: LessonContent["level"] }) | undefined;
    if (!r) return undefined;
    const vocab = db.prepare("SELECT fr,en,pron,example_fr,example_en,example_pron FROM vocab_items WHERE lesson_id=? ORDER BY idx")
      .all(r.id) as { fr: string; en: string; pron: string; example_fr: string; example_en: string; example_pron: string }[];
    return {
      number: r.number, level: r.level, title: r.title, objective: r.objective,
      grammar: { title: r.grammar_title, body: JSON.parse(r.grammar_body), examples: JSON.parse(r.grammar_examples) },
      vocab: vocab.map(v => ({ fr: v.fr, en: v.en, pron: v.pron, exampleFr: v.example_fr, exampleEn: v.example_en, examplePron: v.example_pron })),
      dialogue: JSON.parse(r.dialogue),
      videoQuery: r.video_query, writingPrompt: r.writing_prompt,
    };
  },

  totalLessons(): number {
    return (db.prepare("SELECT COUNT(*) c FROM lessons").get() as { c: number }).c;
  },
};
