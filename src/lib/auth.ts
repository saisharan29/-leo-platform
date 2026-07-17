import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { usersRepo } from "@/server/repo/users.repo";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(creds) {
        const email = creds?.email?.toLowerCase().trim();
        const password = creds?.password ?? "";
        if (!email || !password) return null;
        const user = usersRepo.findByEmail(email);
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;
        const profile = usersRepo.profile(user.id);
        return { id: user.id, email: user.email, name: profile?.display_name ?? "Learner" };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = (user as { id: string }).id;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
};
