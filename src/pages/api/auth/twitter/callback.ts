import type { NextApiRequest, NextApiResponse } from "next";
import OAuth from "oauth-1.0a";
import crypto from "crypto";
import axios from "axios";

const TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY || "";
const TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { oauth_token, oauth_verifier } = req.query;

  if (!oauth_token || !oauth_verifier) {
    return res
      .status(400)
      .json({ error: "Missing oauth_token or oauth_verifier" });
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
    url: "https://api.twitter.com/oauth/access_token",
    method: "POST",
    data: { oauth_token, oauth_verifier },
  };

  try {
    const response = await axios.post(request_data.url, null, {
      params: { oauth_token, oauth_verifier },
      headers: { ...oauth.toHeader(oauth.authorize(request_data)) },
    });
    // Twitter returns the response as a query string
    const params = new URLSearchParams(response.data);
    const access_token = params.get("oauth_token");
    const access_token_secret = params.get("oauth_token_secret");
    const screen_name = params.get("screen_name");
    if (!access_token || !access_token_secret || !screen_name) {
      throw new Error("Missing access token or screen name");
    }
    // For now, just return the tokens and screen name (do not do this in production)
    res.status(200).json({ access_token, access_token_secret, screen_name });
  } catch (error) {
    console.error("Twitter OAuth callback error:", error);
    res.status(500).json({ error: "Failed to complete Twitter OAuth" });
  }
}
