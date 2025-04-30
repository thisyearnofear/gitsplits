import { NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";
import OAuth from "oauth-1.0a";

// Twitter API URLs
const TWITTER_API_URL = "https://api.twitter.com/1.1";

export async function POST(request: Request) {
  try {
    // Get the webhook URL from the request
    const { webhookUrl } = await request.json();

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Missing webhookUrl parameter" },
        { status: 400 }
      );
    }

    // Get Twitter API credentials from environment variables
    const consumerKey = process.env.TWITTER_CONSUMER_KEY;
    const consumerSecret = process.env.TWITTER_CONSUMER_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    const webhookEnv = process.env.TWITTER_WEBHOOK_ENV;

    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret || !webhookEnv) {
      return NextResponse.json(
        { error: "Twitter API credentials not configured" },
        { status: 500 }
      );
    }

    // Create OAuth 1.0a instance
    const oauth = new OAuth({
      consumer: {
        key: consumerKey,
        secret: consumerSecret,
      },
      signature_method: "HMAC-SHA1",
      hash_function(baseString, key) {
        return crypto
          .createHmac("sha1", key)
          .update(baseString)
          .digest("base64");
      },
    });

    // Generate authorization header
    const requestData = {
      url: `${TWITTER_API_URL}/account_activity/all/${webhookEnv}/webhooks.json`,
      method: "POST",
      data: { url: webhookUrl },
    };

    const authorization = oauth.authorize(requestData, {
      key: accessToken,
      secret: accessTokenSecret,
    });

    const headers = oauth.toHeader(authorization);

    // Register the webhook
    const response = await axios.post(
      requestData.url,
      null,
      {
        params: { url: webhookUrl },
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      }
    );

    // Return the response
    return NextResponse.json({
      success: true,
      webhook_id: response.data.id,
      message: "Webhook registered successfully",
    });
  } catch (error: any) {
    console.error("Error registering Twitter webhook:", error);
    
    // Extract error details from Twitter API response
    const errorMessage = error.response?.data?.errors?.[0]?.message || 
                         error.message || 
                         "Failed to register webhook";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.response?.data || null
      },
      { status: error.response?.status || 500 }
    );
  }
}
