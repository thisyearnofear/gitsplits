"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Twitter, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function TwitterCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Verifying your Twitter account...");
  const [twitterHandle, setTwitterHandle] = useState<string>("");

  useEffect(() => {
    async function verifyTwitter() {
      if (!searchParams) {
        setStatus("error");
        setMessage("Missing OAuth parameters. Please try again.");
        return;
      }
      const oauth_token = searchParams.get("oauth_token");
      const oauth_verifier = searchParams.get("oauth_verifier");
      if (!oauth_token || !oauth_verifier) {
        setStatus("error");
        setMessage("Missing OAuth parameters. Please try again.");
        return;
      }
      try {
        const res = await fetch(
          `/api/auth/twitter/callback?oauth_token=${encodeURIComponent(
            oauth_token
          )}&oauth_verifier=${encodeURIComponent(oauth_verifier)}`
        );
        const data = await res.json();
        if (res.ok && data.screen_name) {
          setStatus("success");
          setMessage("Twitter account verified successfully!");
          setTwitterHandle(data.screen_name);
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to verify Twitter account");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred while verifying your Twitter account");
      }
    }
    verifyTwitter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">Twitter Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              {status === "loading" && (
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              )}
              {status === "success" && (
                <CheckCircle className="h-12 w-12 text-green-500" />
              )}
              {status === "error" && (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
              <p className="text-center text-gray-600">{message}</p>
              {status === "success" && twitterHandle && (
                <div className="text-center">
                  <p className="font-medium">Verified as:</p>
                  <p className="text-blue-600 font-bold flex items-center justify-center">
                    <Twitter className="mr-1 h-5 w-5" />@{twitterHandle}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-center">
              <Button onClick={() => router.push("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
