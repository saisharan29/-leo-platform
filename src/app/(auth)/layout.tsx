const LEVELS = [
  { code: "A1", word: "Bonjour" },
  { code: "A2", word: "le café" },
  { code: "B1", word: "discuter" },
  { code: "B2", word: "convaincre" },
  { code: "C1", word: "nuancer" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden lg:flex flex-col justify-between p-12 border-r border-craie">
        {/* soft floating color blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 -left-16 h-72 w-72 rounded-full bg-bleu/10 blur-2xl float-y" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-24 -right-10 h-56 w-56 rounded-full bg-brioche/20 blur-2xl float-y" style={{ animationDelay: "1.2s" }} />

        <div className="font-display text-2xl font-bold text-bleu pop-in">Léo</div>

        <div className="relative max-w-md">
          <div className="float-y w-fit text-7xl drop-shadow-sm" aria-hidden="true">🦊</div>
          <h1 className="mt-6 font-display text-4xl font-bold pop-in">
            French, from your first{" "}
            <span lang="fr" className="relative inline-block text-bleu">
              bonjour
              <svg className="absolute -bottom-2 left-0 h-3 w-full" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true">
                <path className="fil-rouge fil-rouge-draw" style={{ ["--fil-len" as string]: "130" }} d="M2 8 C 30 2, 60 12, 90 6 S 115 5, 118 7" />
              </svg>
            </span>{" "}
            to your first job interview.
          </h1>
          <p className="mt-4 text-lg text-ink2 pop-in" style={{ animationDelay: "120ms" }}>
            84 lessons. A memory that never forgets what you forget. Progress you can actually see.
          </p>
        </div>

        <ul className="stagger flex flex-wrap gap-2" aria-label="Course levels">
          {LEVELS.map((l) => (
            <li key={l.code} className="flex items-center gap-2 rounded-full border border-craie bg-card px-3.5 py-1.5 shadow-card">
              <span className="font-mono text-xs font-bold text-bleu">{l.code}</span>
              <span className="text-sm font-extrabold" lang="fr">{l.word}</span>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex items-center justify-center p-6">{children}</main>
    </div>
  );
}
