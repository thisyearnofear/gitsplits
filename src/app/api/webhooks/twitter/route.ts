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
    // Get the raw body for signature validation
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // Validate the request signature
    const signature = request.headers.get("x-twitter-webhooks-signature") || "";
    const isValid = validateSignature(
      signature,
      rawBody,
      process.env.TWITTER_CONSUMER_SECRET || ""
    );

    if (!isValid) {
      console.error("Invalid Twitter webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Log the event type for debugging
    console.log("Received Twitter webhook event:", Object.keys(payload).join(", "));

    // Process tweet_create_events
    if (payload.tweet_create_events && payload.tweet_create_events.length > 0) {
      for (const tweet of payload.tweet_create_events) {
        // Skip if it's our own tweet to avoid infinite loops
        if (
          tweet.user.screen_name.toLowerCase() ===
          (process.env.TWITTER_SCREEN_NAME || "").toLowerCase()
        ) {
          console.log("Skipping our own tweet:", tweet.id_str);
          continue;
        }

        // Check if the tweet mentions both @bankrbot and @gitsplits
        const mentionsGitSplits =
          tweet.entities.user_mentions &&
          tweet.entities.user_mentions.some(
            (mention: any) =>
              mention.screen_name.toLowerCase() === "gitsplits"
          ) &&
          tweet.entities.user_mentions.some(
            (mention: any) =>
              mention.screen_name.toLowerCase() === "bankrbot"
          );

        if (mentionsGitSplits) {
          console.log("Processing command from tweet:", tweet.id_str);

          // Extract the command from the tweet text
          const tweetText = tweet.text;
          const sender = tweet.user.screen_name;
          const tweetId = tweet.id_str;

          try {
            // Process the command asynchronously
            // We don't await here to avoid blocking the webhook response
            processCommand(tweetText, sender, tweetId).catch(err => {
              console.error(`Error processing command from tweet ${tweetId}:`, err);
            });

            console.log(`Command from tweet ${tweetId} queued for processing`);
          } catch (cmdError) {
            console.error(`Error queuing command from tweet ${tweetId}:`, cmdError);
          }
        }
      }
    }

    // Process direct_message_events (for future implementation)
    if (payload.direct_message_events && payload.direct_message_events.length > 0) {
      console.log("Received direct message events, but handling is not implemented yet");
      // Future implementation for DM handling
    }

    // Always return success to acknowledge receipt of the webhook
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
