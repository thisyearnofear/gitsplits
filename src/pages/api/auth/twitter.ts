import type { NextApiRequest, NextApiResponse } from "next";
import OAuth from "oauth-1.0a";
import crypto from "crypto";
import axios from "axios";

const TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY || "";
const TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET || "";
const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  : "http://localhost:3000/api/auth/twitter/callback";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const oauth = new OAuth({
    consumer: { key: TWITTER_CONSUMER_KEY, secret: TWITTER_CONSUMER_SECRET },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto
        .createHmac("sha1", key)
        .update(base_string)
        .digest("base64");
    },
  });

  const request_data = {
    url: "https://api.twitter.com/oauth/request_token",
    method: "POST",
    data: { oauth_callback: CALLBACK_URL },
  };

  try {
    const response = await axios.post(request_data.url, null, {
      headers: { ...oauth.toHeader(oauth.authorize(request_data)) },
      params: { oauth_callback: CALLBACK_URL },
    });
    const params = new URLSearchParams(response.data);
    const oauth_token = params.get("oauth_token");
    if (!oauth_token) throw new Error("No oauth_token received");
    // Redirect user to Twitter authorization
    res.redirect(
      `https://api.twitter.com/oauth/authorize?oauth_token=${oauth_token}`
    );
  } catch (error) {
    console.error("Twitter OAuth error:", error);
    res.status(500).json({ error: "Failed to initiate Twitter OAuth" });
  }
}
