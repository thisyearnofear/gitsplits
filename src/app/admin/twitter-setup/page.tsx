"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Twitter } from "lucide-react";
import axios from "axios";

export default function TwitterSetupPage() {
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [webhookId, setWebhookId] = useState<string>("");

  const handleRegisterWebhook = async () => {
    if (!webhookUrl) {
      setStatus("error");
      setMessage("Webhook URL is required");
      return;
    }

    try {
      setStatus("loading");
      
      // Call the API to register the webhook
      const response = await axios.post("/api/webhooks/twitter/register", {
        webhookUrl
      });
      
      if (response.data.success) {
        setWebhookId(response.data.webhook_id);
        setStatus("success");
        setMessage("Webhook registered successfully");
      } else {
        setStatus("error");
        setMessage(response.data.error || "Failed to register webhook");
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.response?.data?.error || "An error occurred while registering webhook");
      console.error("Error registering webhook:", error);
    }
  };

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>Twitter Webhook Setup</CardTitle>
          <CardDescription>
            Register a webhook URL to receive Twitter events
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {status === "success" && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                {message}
                {webhookId && (
                  <div className="mt-2">
                    <strong>Webhook ID:</strong> {webhookId}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <div className="flex items-center space-x-2">
              <Twitter className="h-4 w-4 text-blue-500" />
              <Input 
                id="webhookUrl" 
                value={webhookUrl} 
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-domain.com/api/webhooks/twitter"
              />
            </div>
            <p className="text-xs text-gray-500">
              This URL must be publicly accessible and support both GET and POST requests.
            </p>
          </div>
          
          <div className="space-y-2 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium">Twitter API Configuration</h3>
            <p className="text-sm text-gray-600">
              Make sure you have set the following environment variables:
            </p>
            <ul className="text-xs text-gray-500 list-disc list-inside">
              <li>TWITTER_CONSUMER_KEY</li>
              <li>TWITTER_CONSUMER_SECRET</li>
              <li>TWITTER_ACCESS_TOKEN</li>
              <li>TWITTER_ACCESS_TOKEN_SECRET</li>
              <li>TWITTER_WEBHOOK_ENV</li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleRegisterWebhook}
            disabled={status === "loading" || !webhookUrl}
          >
            {status === "loading" ? "Registering..." : "Register Webhook"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
