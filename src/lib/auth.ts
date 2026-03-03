import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email e password richiesti");
        }

        const db = await getDb();
        const user = await db
          .collection("users")
          .findOne({ email: credentials.email });

        if (!user) {
          throw new Error("Utente non trovato");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) {
          throw new Error("Password non valida");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Leggi stato abbonamento al momento del login
        const db = await getDb();
        const dbUser = await db
          .collection("users")
          .findOne({ _id: new ObjectId(user.id) });
        token.subscriptionStatus = dbUser?.subscriptionStatus ?? "none";
        token.trialEndsAt = dbUser?.trialEndsAt?.toISOString() ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as {
          id?: string;
          subscriptionStatus?: string;
          trialEndsAt?: string | null;
        };
        u.id = token.id as string;
        u.subscriptionStatus = token.subscriptionStatus as string;
        u.trialEndsAt = token.trialEndsAt as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
