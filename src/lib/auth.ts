import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

// Define allowed admin emails - add your email here
const ALLOWED_ADMINS = process.env.ALLOWED_ADMIN_EMAILS?.split(',') || [];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
      const isAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');
      
      // Always allow auth routes
      if (isAuthRoute) return true;
      
      // For admin routes, check if user is authenticated and authorized
      if (isAdminRoute) {
        if (!auth?.user?.email) return false;
        return ALLOWED_ADMINS.includes(auth.user.email);
      }
      
      // Allow all other routes (public)
      return true;
    },
    signIn({ user }) {
      // Only allow sign in if user email is in allowed list
      if (!user.email) return false;
      return ALLOWED_ADMINS.includes(user.email);
    },
    session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
