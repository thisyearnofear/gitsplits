import { NextResponse } from "next/server";
import crypto from "crypto";
import { processCommand } from "@/utils/commands";

// Twitter webhook CRC token validation
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crcToken = searchParams.get("crc_token");

  if (!crcToken) {
    return NextResponse.json(
      { error: "Missing crc_token parameter" },
      { status: 400 }
    );
  }

  // Create HMAC SHA-256 hash with consumer secret
  const hmac = crypto.createHmac(
    "sha256",
    process.env.TWITTER_CONSUMER_SECRET || ""
  );
  hmac.update(crcToken);
  const responseToken = `sha256=${hmac.digest("base64")}`;

  // Return the response token
  return NextResponse.json({ response_token: responseToken });
}

// Handle Twitter webhook events
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Validate the request signature
    const signature = request.headers.get("x-twitter-webhooks-signature") || "";
    const isValid = validateSignature(
      signature,
      JSON.stringify(payload),
      process.env.TWITTER_CONSUMER_SECRET || ""
    );

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Process tweet_create_events
    if (payload.tweet_create_events && payload.tweet_create_events.length > 0) {
      for (const tweet of payload.tweet_create_events) {
        // Skip if it's our own tweet
        if (
          tweet.user.screen_name.toLowerCase() ===
          (process.env.TWITTER_SCREEN_NAME || "").toLowerCase()
        ) {
          continue;
        }

        // Check if the tweet mentions @bankrbot and @gitsplits
        const mentionsGitSplits =
          tweet.entities.user_mentions.some(
            (mention: any) =>
              mention.screen_name.toLowerCase() === "gitsplits"
          ) &&
          tweet.entities.user_mentions.some(
            (mention: any) =>
              mention.screen_name.toLowerCase() === "bankrbot"
          );

        if (mentionsGitSplits) {
          // Extract the command from the tweet text
          const tweetText = tweet.text;
          const sender = tweet.user.screen_name;
          const tweetId = tweet.id_str;

          // Process the command
          await processCommand(tweetText, sender, tweetId);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Twitter webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Validate Twitter webhook signature
function validateSignature(
  signature: string,
  body: string,
  consumerSecret: string
): boolean {
  try {
    const hmac = crypto.createHmac("sha256", consumerSecret);
    hmac.update(body);
    const expectedSignature = `sha256=${hmac.digest("base64")}`;
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Error validating signature:", error);
    return false;
  }
}
