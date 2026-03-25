import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = process.env.AUTH_EMAIL
        const password = process.env.AUTH_PASSWORD

        if (!email || !password) {
          console.error('[Auth] AUTH_EMAIL or AUTH_PASSWORD not set')
          return null
        }

        if (
          credentials?.email === email &&
          credentials?.password === password
        ) {
          return { id: '1', email, name: 'Matt' }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
