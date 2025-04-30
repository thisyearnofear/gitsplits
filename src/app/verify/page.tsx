"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Github, Twitter } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const twitterUsername = searchParams.get("twitter");
  const githubUsername = searchParams.get("github");
  
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [verificationId, setVerificationId] = useState<string>("");

  const handleInitiateVerification = async () => {
    if (!twitterUsername || !githubUsername) {
      setStatus("error");
      setMessage("Twitter username and GitHub username are required");
      return;
    }

    try {
      setStatus("loading");
      
      // Call the API to initiate verification
      const response = await axios.post("/api/github/verify", {
        twitterUsername,
        githubUsername
      });
      
      if (response.data.success) {
        setVerificationCode(response.data.verificationCode);
        setVerificationId(response.data.verificationId);
        setStatus("success");
        setMessage("Verification initiated successfully. Please add the verification code to your GitHub profile or create a repository with this name.");
      } else {
        setStatus("error");
        setMessage(response.data.error || "Failed to initiate verification");
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.response?.data?.error || "An error occurred while initiating verification");
      console.error("Error initiating verification:", error);
    }
  };

  const handleCheckVerification = async () => {
    if (!verificationId) {
      setStatus("error");
      setMessage("No active verification to check");
      return;
    }

    try {
      setStatus("loading");
      
      // Call the API to check verification status
      const response = await axios.get(`/api/github/verify?id=${verificationId}`);
      
      if (response.data.status === "completed") {
        setStatus("success");
        setMessage("Verification completed successfully! Your GitHub identity is now linked to your Twitter account.");
      } else {
        setStatus("error");
        setMessage(response.data.message || "Verification is still pending. Please make sure you've added the verification code to your GitHub profile.");
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.response?.data?.error || "An error occurred while checking verification");
      console.error("Error checking verification:", error);
    }
  };

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>GitHub Identity Verification</CardTitle>
          <CardDescription>
            Link your GitHub identity to your Twitter account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {status === "success" && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
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
            <Label htmlFor="twitter">Twitter Username</Label>
            <div className="flex items-center space-x-2">
              <Twitter className="h-4 w-4 text-blue-500" />
              <Input 
                id="twitter" 
                value={twitterUsername || ""} 
                readOnly 
                disabled={!!twitterUsername}
                placeholder="Your Twitter username"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="github">GitHub Username</Label>
            <div className="flex items-center space-x-2">
              <Github className="h-4 w-4 text-gray-700" />
              <Input 
                id="github" 
                value={githubUsername || ""} 
                readOnly 
                disabled={!!githubUsername}
                placeholder="Your GitHub username"
              />
            </div>
          </div>
          
          {verificationCode && (
            <div className="space-y-2 p-4 bg-gray-50 rounded-md">
              <Label>Verification Code</Label>
              <div className="font-mono text-sm bg-gray-100 p-2 rounded border">
                {verificationCode}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Add this code to your GitHub profile bio or create a repository with this name to verify your identity.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          {!verificationCode ? (
            <Button 
              className="w-full" 
              onClick={handleInitiateVerification}
              disabled={status === "loading" || !twitterUsername || !githubUsername}
            >
              {status === "loading" ? "Initiating..." : "Initiate Verification"}
            </Button>
          ) : (
            <Button 
              className="w-full" 
              onClick={handleCheckVerification}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Checking..." : "Check Verification Status"}
            </Button>
          )}
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              Back to Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
