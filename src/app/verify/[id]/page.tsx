"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Github, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

export default function VerificationPage() {
  const params = useParams();
  const verificationId = params.id as string;
  
  const [status, setStatus] = useState<"loading" | "pending" | "completed" | "expired" | "failed">("loading");
  const [message, setMessage] = useState<string>("");
  const [githubUsername, setGithubUsername] = useState<string>("");
  const [twitterUsername, setTwitterUsername] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    checkVerificationStatus();
  }, [verificationId]);

  const checkVerificationStatus = async () => {
    try {
      setIsChecking(true);
      const response = await axios.get(`/api/github/verify?id=${verificationId}`);
      
      setStatus(response.data.status);
      setMessage(response.data.message);
      
      if (response.data.githubUsername) {
        setGithubUsername(response.data.githubUsername);
      }
      
      if (response.data.twitterUsername) {
        setTwitterUsername(response.data.twitterUsername);
      }
      
      if (response.data.verificationCode) {
        setVerificationCode(response.data.verificationCode);
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
      setStatus("failed");
      setMessage("Failed to check verification status. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const renderStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case "pending":
        return <Clock className="h-16 w-16 text-amber-500" />;
      case "expired":
        return <XCircle className="h-16 w-16 text-red-500" />;
      case "failed":
        return <XCircle className="h-16 w-16 text-red-500" />;
      default:
        return <RefreshCw className="h-16 w-16 text-blue-500 animate-spin" />;
    }
  };

  const renderStatusTitle = () => {
    switch (status) {
      case "completed":
        return "Verification Completed";
      case "pending":
        return "Verification Pending";
      case "expired":
        return "Verification Expired";
      case "failed":
        return "Verification Failed";
      default:
        return "Checking Verification Status...";
    }
  };

  const renderStatusDescription = () => {
    if (message) {
      return message;
    }

    switch (status) {
      case "completed":
        return `Your GitHub identity (${githubUsername}) has been successfully linked to your X account (${twitterUsername}).`;
      case "pending":
        return "Your verification is still pending. Please add the verification code to your GitHub profile or create a repository with the code as the name.";
      case "expired":
        return "Your verification has expired. Please initiate a new verification.";
      case "failed":
        return "Your verification has failed. Please try again.";
      default:
        return "Checking verification status...";
    }
  };

  const renderVerificationInstructions = () => {
    if (status !== "pending" || !verificationCode) {
      return null;
    }

    return (
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold">Verification Instructions</h3>
        <p>To complete verification, do one of the following:</p>
        
        <div className="space-y-2">
          <h4 className="font-medium">Option 1: Add to GitHub Bio</h4>
          <p>Add this code to your GitHub profile bio:</p>
          <div className="bg-muted p-2 rounded font-mono text-sm break-all">
            {verificationCode}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`https://github.com/settings/profile`, "_blank")}
          >
            <Github className="mr-2 h-4 w-4" />
            Edit GitHub Profile
          </Button>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Option 2: Create a Repository</h4>
          <p>Create a new repository with this exact name:</p>
          <div className="bg-muted p-2 rounded font-mono text-sm break-all">
            {verificationCode}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`https://github.com/new`, "_blank")}
          >
            <Github className="mr-2 h-4 w-4" />
            Create GitHub Repository
          </Button>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Option 3: Create a Gist</h4>
          <p>Create a new gist with the verification code as the filename or content:</p>
          <div className="bg-muted p-2 rounded font-mono text-sm break-all">
            {verificationCode}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`https://gist.github.com/`, "_blank")}
          >
            <Github className="mr-2 h-4 w-4" />
            Create GitHub Gist
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen page-gradient py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">GitHub Identity Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              {renderStatusIcon()}
              <h2 className="text-xl font-semibold">{renderStatusTitle()}</h2>
              <p className="text-center text-muted-foreground">{renderStatusDescription()}</p>
            </div>

            {renderVerificationInstructions()}

            <div className="flex justify-center mt-6">
              <Button 
                onClick={checkVerificationStatus} 
                disabled={isChecking}
                className="w-full md:w-auto"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Verification Status
                  </>
                )}
              </Button>
            </div>

            {status === "completed" && (
              <Alert className="mt-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Verification Successful</AlertTitle>
                <AlertDescription>
                  You can now create and manage splits for repositories you own, and receive distributions for repositories you contribute to.
                </AlertDescription>
              </Alert>
            )}

            {status === "expired" && (
              <Alert className="mt-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <XCircle className="h-4 w-4 text-red-500" />
                <AlertTitle>Verification Expired</AlertTitle>
                <AlertDescription>
                  Please initiate a new verification:
                  <div className="mt-2 bg-muted p-2 rounded font-mono text-sm">
                    DM @gitsplits verify {githubUsername}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
