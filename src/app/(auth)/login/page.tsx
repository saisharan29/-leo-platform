"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setError("Email or password is incorrect.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="pop-in w-full max-w-md p-8">
      <div className="mb-1 flex items-center gap-3">
        <span className="text-4xl lg:hidden" aria-hidden="true">🐓</span>
        <h1 className="font-display text-3xl font-bold">Welcome back</h1>
      </div>
      <p className="text-ink2 mb-6">Your streak missed you. Sign in to keep it alive 🔥</p>
      <div className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {error ? (
          <p role="alert" className="text-sm font-semibold text-groseille">
            {error}
          </p>
        ) : null}
        <Button size="lg" onClick={submit} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </div>
      <p className="mt-6 text-sm text-ink2">
        New here?{" "}
        <Link href="/register" className="font-extrabold text-bleu hover:underline">
          Create an account
        </Link>
      </p>
    </Card>
  );
}
