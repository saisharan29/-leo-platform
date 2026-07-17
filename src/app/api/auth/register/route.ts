import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/zodschemas";
import { usersRepo } from "@/server/repo/users.repo";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: parsed.error.issues[0].message } }, { status: 400 });
  }
  const { email, password, displayName } = parsed.data;
  if (usersRepo.findByEmail(email.toLowerCase())) {
    return NextResponse.json({ error: { code: "email_taken", message: "An account with this email already exists." } }, { status: 409 });
  }
  const hash = await bcrypt.hash(password, 12);
  const userId = usersRepo.create(email.toLowerCase(), hash, displayName);
  return NextResponse.json({ userId }, { status: 201 });
}
