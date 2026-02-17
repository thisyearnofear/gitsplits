"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github, Twitter, Copy, ExternalLink, Check } from "lucide-react";

interface IdentityVerificationProps {
  platform: "github" | "twitter";
  username: string;
  signature: string;
  isVerified: boolean;
  copied: boolean;
  onUsernameChange: (value: string) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onPostToTwitter?: () => void;
}

export const IdentityVerification: React.FC<IdentityVerificationProps> = ({
  platform,
  username,
  signature,
  isVerified,
  copied,
  onUsernameChange,
  onGenerate,
  onCopy,
  onPostToTwitter,
}) => {
  const isTwitter = platform === "twitter";
  const Icon = isTwitter ? Twitter : Github;
  const platformName = isTwitter ? "X/Twitter" : "GitHub";
  const placeholder = isTwitter ? "your_handle" : "your-username";

  if (isVerified) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Icon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">{platformName} Verified</p>
              <p className="text-sm text-gray-600">@{username}</p>
            </div>
            <Check className="w-5 h-5 text-green-500 ml-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <h3 className="font-medium">Verify {platformName}</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${platform}-username`}>{platformName} Username</Label>
          <Input
            id={`${platform}-username`}
            placeholder={placeholder}
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
          />
        </div>

        {!signature ? (
          <Button 
            onClick={onGenerate} 
            disabled={!username}
            className="w-full"
          >
            Generate Verification Code
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-mono break-all">{signature}</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={onCopy} variant="outline" className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                {copied ? "Copied!" : "Copy"}
              </Button>
              
              {isTwitter && onPostToTwitter && (
                <Button onClick={onPostToTwitter} className="flex-1">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Post to X
                </Button>
              )}
            </div>

            {isTwitter && (
              <div className="space-y-2">
                <Label htmlFor="tweet-url">Tweet URL</Label>
                <Input
                  id="tweet-url"
                  placeholder="https://x.com/..."
                  // This would need to be passed from parent
                />
              </div>
            )}

            {!isTwitter && (
              <div className="text-sm text-gray-600">
                <p className="font-medium">Next steps:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Create a new Gist at gist.github.com</li>
                  <li>Paste the verification code</li>
                  <li>Name the file "gitsplits-verification.txt"</li>
                  <li>Save as a public gist</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
