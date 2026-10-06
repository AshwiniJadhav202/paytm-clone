import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const authOptions = {
  providers: [
    // ==========================================
    // CREDENTIALS LOGIN
    // ==========================================
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        identifier: {
          label: "Email or Mobile Number",
          type: "text",
          placeholder: "Email or mobile number",
          required: true,
        },

        password: {
          label: "Password",
          type: "password",
          required: true,
        },
      },

      async authorize(credentials: any) {
        if (
          !credentials?.identifier ||
          !credentials?.password
        ) {
          return null;
        }

        const identifier =
          credentials.identifier.trim();

        const password = credentials.password;

        const existingUser =
          await db.user.findFirst({
            where: {
              OR: [
                {
                  email: identifier.toLowerCase(),
                },
                {
                  number: identifier,
                },
              ],
            },
          });

        if (!existingUser) {
          return null;
        }

        const passwordValidation =
          await bcrypt.compare(
            password,
            existingUser.password
          );

        if (!passwordValidation) {
          return null;
        }

        return {
          id: existingUser.id.toString(),
          name: existingUser.name,
          email: existingUser.email,
        };
      },
    }),

    // ==========================================
    // GOOGLE LOGIN
    // ==========================================
    GoogleProvider({
      clientId:
        process.env.GOOGLE_CLIENT_ID || "",

      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || "",

      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],

  // ==========================================
  // NEXT AUTH CONFIG
  // ==========================================
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "secret",

  session: {
    strategy: "jwt" as const,
  },

  callbacks: {
    // ==========================================
    // SIGN IN
    // ==========================================
    async signIn({ user, account }: any) {
      // Credentials login
      if (account?.provider !== "google") {
        return true;
      }

      // Google must provide email
      if (!user?.email) {
        console.error(
          "Google login failed: email not provided"
        );

        return false;
      }

      const email =
        user.email.trim().toLowerCase();

      try {
        // ----------------------------------------
        // Check existing user
        // ----------------------------------------
        let existingUser =
          await db.user.findUnique({
            where: {
              email,
            },
          });

        // ----------------------------------------
        // Create new Google user
        // ----------------------------------------
        if (!existingUser) {
          const randomPassword =
            crypto
              .randomBytes(32)
              .toString("hex");

          const hashedPassword =
            await bcrypt.hash(
              randomPassword,
              10
            );

          /*
           * number must be unique.
           * Google users don't necessarily have
           * a mobile number.
           */
          const randomNumber =
            `google_${crypto.randomUUID()}`;

          /*
           * User.balance has a default value
           * in the current Prisma schema.
           *
           * Therefore, we no longer create a
           * separate Balance record.
           */
          existingUser =
            await db.user.create({
              data: {
                email,
                name:
                  user.name ||
                  "Google User",
                number: randomNumber,
                password:
                  hashedPassword,
              },
            });

          console.log(
            "New Google user created:",
            existingUser.id
          );
        }

        // ----------------------------------------
        // IMPORTANT:
        // Use DATABASE User ID, not Google ID
        // ----------------------------------------
        user.id =
          existingUser.id.toString();

        return true;
      } catch (error) {
        console.error(
          "Google sign-in error:",
          error
        );

        return false;
      }
    },

    // ==========================================
    // JWT
    // ==========================================
    async jwt({ token, user }: any) {
      /*
       * During first login, user.id contains
       * our DATABASE User ID.
       */
      if (user?.id) {
        token.sub =
          user.id.toString();
      }

      /*
       * Extra protection:
       * If email exists, always resolve the
       * database User ID from our database.
       */
      if (user?.email) {
        const existingUser =
          await db.user.findUnique({
            where: {
              email:
                user.email
                  .toLowerCase(),
            },
            select: {
              id: true,
            },
          });

        if (existingUser) {
          token.sub =
            existingUser.id.toString();
        }
      }

      return token;
    },

    // ==========================================
    // SESSION
    // ==========================================
    async session({
      token,
      session,
    }: any) {
      if (
        session.user &&
        token.sub
      ) {
        session.user.id =
          token.sub;
      }

      return session;
    },
  },
};
