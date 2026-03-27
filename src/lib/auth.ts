import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { verify } from 'jsonwebtoken';
import { supabase } from '@/lib/supabase/client';

export const authOptions: NextAuthOptions = {
  providers: [
    // Admin provider (existing — env-based credentials)
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const emailsRaw = process.env.AUTH_EMAIL;
        const password = process.env.AUTH_PASSWORD;

        if (!emailsRaw || !password) {
          console.error('[Auth] AUTH_EMAIL or AUTH_PASSWORD not set');
          return null;
        }

        const allowedEmails = emailsRaw.split(',').map((e) => e.trim().toLowerCase());
        const inputEmail = credentials?.email?.trim().toLowerCase();

        if (inputEmail && allowedEmails.includes(inputEmail) && credentials?.password === password) {
          const name = inputEmail.split('@')[0].replace(/^\w/, (c: string) => c.toUpperCase());
          return { id: inputEmail, email: inputEmail, name, role: 'admin' };
        }

        return null;
      },
    }),

    // Portal provider (new — DB-based client_users)
    CredentialsProvider({
      id: 'portal-credentials',
      name: 'Portal',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) return null;

        const { data: user, error } = await supabase
          .from('client_users')
          .select('id, email, name, password_hash, role, client_id, accepted_at')
          .eq('email', email)
          .single();

        if (error || !user || !user.password_hash || !user.accepted_at) return null;

        const valid = await compare(password, user.password_hash);
        if (!valid) return null;

        // Update last_login_at
        await supabase
          .from('client_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);

        // Fetch client name for session
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', user.client_id)
          .single();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.client_id,
          clientName: client?.name || '',
        };
      },
    }),
    // Admin impersonation provider (JWT-based, no password)
    CredentialsProvider({
      id: 'portal-impersonate',
      name: 'Portal Impersonate',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        const token = credentials?.token;
        if (!token) return null;

        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret) return null;

        try {
          const payload = verify(token, secret) as {
            clientId: string;
            clientName: string;
            role: string;
            impersonator: string;
            purpose: string;
          };

          if (payload.purpose !== 'portal-impersonate') return null;

          return {
            id: payload.impersonator,
            email: payload.impersonator,
            name: 'Admin',
            role: payload.role,
            clientId: payload.clientId,
            clientName: payload.clientName,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.role = u.role as string;
        token.clientId = u.clientId as string | undefined;
        token.clientName = u.clientName as string | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session as unknown as Record<string, unknown>).role = token.role;
        (session as unknown as Record<string, unknown>).clientId = token.clientId;
        (session as unknown as Record<string, unknown>).clientName = token.clientName;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
