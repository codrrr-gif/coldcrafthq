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
        const emailsRaw = process.env.AUTH_EMAIL
        const password = process.env.AUTH_PASSWORD

        if (!emailsRaw || !password) {
          console.error('[Auth] AUTH_EMAIL or AUTH_PASSWORD not set')
          return null
        }

        const allowedEmails = emailsRaw.split(',').map(e => e.trim().toLowerCase())
        const inputEmail = credentials?.email?.trim().toLowerCase()

        if (
          inputEmail &&
          allowedEmails.includes(inputEmail) &&
          credentials?.password === password
        ) {
          const name = inputEmail.split('@')[0].replace(/^\w/, (c: string) => c.toUpperCase())
          return { id: inputEmail, email: inputEmail, name }
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
