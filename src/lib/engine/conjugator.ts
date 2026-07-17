// Conjugation engine: 6 tenses, regular -er/-ir/-re + 14 core irregulars.
// Passé composé shows masculine agreement by default (documented in UI copy).

export const PERSONS = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"] as const;
export type Tense = "pres" | "imp" | "fut" | "cond" | "pc" | "subj";
export const TENSE_LABELS: Record<Tense, string> = {
  pres: "Présent", imp: "Imparfait", fut: "Futur simple",
  cond: "Conditionnel", pc: "Passé composé", subj: "Subjonctif",
};

interface Irregular {
  en: string;
  pres: [string, string, string, string, string, string];
  pp: string;
  fut: string;
  aux?: "être";
  impStem?: string;
  subj?: [string, string, string, string, string, string];
  subjStem?: string;          // same stem for all persons (fass-, puiss-, sach-)
  subjStem2?: [string, string]; // [je/tu/il/ils stem, nous/vous stem]
}

export const REGULAR_VERBS: [string, string][] = [
  ["parler", "to speak"], ["manger", "to eat"], ["travailler", "to work"], ["habiter", "to live"],
  ["aimer", "to like / love"], ["écouter", "to listen"], ["regarder", "to watch"], ["étudier", "to study"],
  ["donner", "to give"], ["penser", "to think"], ["trouver", "to find"], ["demander", "to ask"],
  ["jouer", "to play"], ["visiter", "to visit"], ["chercher", "to look for"], ["commencer", "to start"],
  ["finir", "to finish"], ["choisir", "to choose"], ["réussir", "to succeed"], ["remplir", "to fill"],
  ["vendre", "to sell"], ["attendre", "to wait"], ["répondre", "to answer"], ["perdre", "to lose"],
  ["entendre", "to hear"],
];

export const IRREGULAR_VERBS: Record<string, Irregular> = {
  "être": { en: "to be", pres: ["suis","es","est","sommes","êtes","sont"], pp: "été", fut: "ser", subj: ["sois","sois","soit","soyons","soyez","soient"], impStem: "ét" },
  "avoir": { en: "to have", pres: ["ai","as","a","avons","avez","ont"], pp: "eu", fut: "aur", subj: ["aie","aies","ait","ayons","ayez","aient"] },
  "aller": { en: "to go", pres: ["vais","vas","va","allons","allez","vont"], pp: "allé", aux: "être", fut: "ir", subjStem2: ["aill","all"] },
  "faire": { en: "to do / make", pres: ["fais","fais","fait","faisons","faites","font"], pp: "fait", fut: "fer", subjStem: "fass" },
  "pouvoir": { en: "to be able to", pres: ["peux","peux","peut","pouvons","pouvez","peuvent"], pp: "pu", fut: "pourr", subjStem: "puiss" },
  "vouloir": { en: "to want", pres: ["veux","veux","veut","voulons","voulez","veulent"], pp: "voulu", fut: "voudr", subjStem2: ["veuill","voul"] },
  "devoir": { en: "to have to", pres: ["dois","dois","doit","devons","devez","doivent"], pp: "dû", fut: "devr" },
  "savoir": { en: "to know (facts)", pres: ["sais","sais","sait","savons","savez","savent"], pp: "su", fut: "saur", subjStem: "sach" },
  "venir": { en: "to come", pres: ["viens","viens","vient","venons","venez","viennent"], pp: "venu", aux: "être", fut: "viendr" },
  "prendre": { en: "to take", pres: ["prends","prends","prend","prenons","prenez","prennent"], pp: "pris", fut: "prendr" },
  "mettre": { en: "to put", pres: ["mets","mets","met","mettons","mettez","mettent"], pp: "mis", fut: "mettr" },
  "dire": { en: "to say", pres: ["dis","dis","dit","disons","dites","disent"], pp: "dit", fut: "dir" },
  "voir": { en: "to see", pres: ["vois","vois","voit","voyons","voyez","voient"], pp: "vu", fut: "verr" },
  "partir": { en: "to leave", pres: ["pars","pars","part","partons","partez","partent"], pp: "parti", aux: "être", fut: "partir" },
};

export const ALL_VERBS: string[] = [...Object.keys(IRREGULAR_VERBS), ...REGULAR_VERBS.map(v => v[0])];

export function verbMeaning(inf: string): string {
  return IRREGULAR_VERBS[inf]?.en ?? REGULAR_VERBS.find(v => v[0] === inf)?.[1] ?? "";
}

const IMP_ENDINGS = ["ais", "ais", "ait", "ions", "iez", "aient"];
const FUT_ENDINGS = ["ai", "as", "a", "ons", "ez", "ont"];
const AVOIR_PRES = ["ai", "as", "a", "avons", "avez", "ont"];
const ETRE_PRES = ["suis", "es", "est", "sommes", "êtes", "sont"];

export function conjugate(inf: string, tense: Tense): string[] {
  const irr = IRREGULAR_VERBS[inf];
  const group = irr ? null : inf.slice(-2) === "er" ? "er" : inf.slice(-2) === "ir" ? "ir" : "re";
  const stem = group ? inf.slice(0, -2) : "";

  let pres: string[];
  if (irr) pres = irr.pres.slice();
  else if (group === "er") {
    pres = ["e", "es", "e", "ons", "ez", "ent"].map((e, i) => {
      let st = stem;
      if (i === 3 && /g$/.test(stem)) st = stem + "e";       // mangeons
      if (i === 3 && /c$/.test(stem)) st = stem.slice(0, -1) + "ç"; // commençons
      return st + e;
    });
  } else if (group === "ir") pres = ["is", "is", "it", "issons", "issez", "issent"].map(e => stem + e);
  else pres = ["s", "s", "", "ons", "ez", "ent"].map(e => stem + e);

  const impStem = irr?.impStem ?? pres[3].replace(/ons$/, "");
  const futStem = irr ? irr.fut : group === "re" ? inf.slice(0, -1) : inf;
  const pp = irr ? irr.pp : group === "er" ? stem + "é" : group === "ir" ? stem + "i" : stem + "u";
  const aux = irr?.aux === "être" ? "être" : "avoir";

  switch (tense) {
    case "pres": return pres;
    case "imp": return IMP_ENDINGS.map(e => impStem + e);
    case "fut": return FUT_ENDINGS.map(e => futStem + e);
    case "cond": return IMP_ENDINGS.map(e => futStem + e);
    case "pc": {
      const auxForms = aux === "être" ? ETRE_PRES : AVOIR_PRES;
      return auxForms.map((a, i) => a + " " + pp + (aux === "être" && i >= 3 ? "s" : ""));
    }
    case "subj": {
      if (irr?.subj) return irr.subj.slice();
      const st1 = irr?.subjStem ?? irr?.subjStem2?.[0] ?? pres[5].replace(/ent$/, "");
      const st2 = irr?.subjStem ?? irr?.subjStem2?.[1] ?? impStem;
      return [st1 + "e", st1 + "es", st1 + "e", st2 + "ions", st2 + "iez", st1 + "ent"];
    }
  }
}

/** Full form with pronoun, applying je→j' elision. */
export function withPronoun(personIdx: number, form: string): string {
  if (personIdx === 0) {
    const first = form.split(" ")[0];
    return /^[aeiouyàâéèêëîïôöùûüh]/i.test(first) ? "j'" + form : "je " + form;
  }
  return PERSONS[personIdx] + " " + form;
}
