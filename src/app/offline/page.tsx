import Link from "next/link";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl" aria-hidden="true">🦊</p>
      <h1 className="font-display text-3xl font-bold">You're offline</h1>
      <p className="max-w-sm text-ink2">
        Pages you downloaded still work — anything else needs a connection. Progress made online is
        safe on the server.
      </p>
      <Link href="/dashboard" className="press rounded-input bg-bleu px-5 py-2.5 font-extrabold text-white">
        Try again
      </Link>
    </main>
  );
}
