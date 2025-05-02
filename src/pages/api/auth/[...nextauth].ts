import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";

export default NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CONSUMER_KEY!,
      clientSecret: process.env.TWITTER_CONSUMER_SECRET!,
      version: "1.0A", // Force OAuth 1.0a
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      return "/dashboard";
    },
  },
  // You can add callbacks, session, etc. here as needed
});
