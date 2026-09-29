
import GoogleProvider from "next-auth/providers/google";
import { NextAuthOptions } from "next-auth";

import db from "@repo/db/client";

export const authOptions: NextAuthOptions = {
  providers: [
   GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",

  authorization: {
    params: {
      prompt: "select_account",
    },
  },
}),
  ],

  callbacks: {
    async signIn({ user, account }) {
      console.log("Merchant sign-in:", user.email);

      if (!user.email) {
        return false;
      }

      const provider = account?.provider === "google"
        ? "Google"
        : "Github";

      await db.merchant.upsert({
        where: {
          email: user.email,
        },

        create: {
          email: user.email,
          name: user.name,
          auth_type: provider,
        },

        update: {
          name: user.name,
          auth_type: provider,
        },

        select: {
          id: true,
        },
      });

      return true;
    },

    async jwt({ token, user }) {
      // Add user information when signing in
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }

      return token;
    },

    async session({ session, token }) {
      // Explicitly add email and name to the session
      if (session.user) {
        session.user.email = token.email ?? null;
        session.user.name = token.name ?? null;
      }

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || "secret",

  session: {
    strategy: "jwt",
  },
};