import { NextResponse } from "next/server";
import { contentRepo } from "@/server/repo/content.repo";
import { db } from "@/server/db";

/**
 * One-time admin bootstrap for deployments without shell access (e.g. Render free tier).
 * Usage: set ADMIN_SETUP_TOKEN in the environment, then open:
 *   /api/admin/bootstrap?token=YOUR_TOKEN&email=you@example.com
 *
 * GET is used deliberately so this works from a plain browser address bar.
 * The route is inert unless ADMIN_SETUP_TOKEN is configured, and the token
 * should be long and random. Rotate or remove the env var after use if you wish.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected || expected.length < 16) {
    return NextResponse.json(
      { error: { code: "disabled", message: "Admin bootstrap is not enabled on this server." } },
      { status: 404 },
    );
  }
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  if (token !== expected) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Invalid token." } },
      { status: 403 },
    );
  }
  if (!email) {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "Pass ?email=the-account-to-promote" } },
      { status: 400 },
    );
  }
  const user = db.prepare("SELECT id FROM users WHERE email=?").get(email) as
    | { id: string }
    | undefined;
  if (!user) {
    return NextResponse.json(
      { error: { code: "not_found", message: `No account with email ${email}. Register on the site first, then retry.` } },
      { status: 404 },
    );
  }
  contentRepo.setRole(user.id, "admin");
  return NextResponse.json({ ok: true, message: `${email} is now an admin. Visit /admin.` });
}
