"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Name needs at least 2 characters.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password needs at least 8 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    setFormError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      if (res.status === 409) {
        setErrors({ email: "An account with this email already exists." });
        setBusy(false);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setFormError(body?.error ?? "Something went wrong. Try again.");
        setBusy(false);
        return;
      }
      const login = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      setBusy(false);
      if (login?.error) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFormError("Network error. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <Card className="pop-in w-full max-w-md p-8">
      <div className="mb-1 flex items-center gap-3">
        <span className="text-4xl lg:hidden" aria-hidden="true">🦊</span>
        <h1 className="font-display text-3xl font-bold">Create your account</h1>
      </div>
      <p className="text-ink2 mb-6">Lesson 1 takes 15 minutes. Léo does the remembering.</p>
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          error={errors.password}
        />
        {formError ? (
          <p role="alert" className="text-sm font-semibold text-groseille">
            {formError}
          </p>
        ) : null}
        <Button size="lg" onClick={submit} disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </div>
      <p className="mt-6 text-sm text-ink2">
        Already learning?{" "}
        <Link href="/login" className="font-extrabold text-bleu hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
