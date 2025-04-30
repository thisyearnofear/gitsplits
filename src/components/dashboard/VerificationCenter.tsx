import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Github,
  GitBranch,
  RefreshCw,
} from "lucide-react";

interface VerificationCenterProps {
  isGitHubConnected: boolean;
  setIsGitHubConnected: (connected: boolean) => void;
}

const VerificationCenter: React.FC<VerificationCenterProps> = ({
  isGitHubConnected,
  setIsGitHubConnected,
}) => {
  const [verificationLevel, setVerificationLevel] = useState(1); // Basic level by default
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">
                Level {verificationLevel}: {verificationLevel === 1 ? "Basic" : 
                                           verificationLevel === 2 ? "GitHub Verified" : 
                                           verificationLevel === 3 ? "Repository Verified" : "None"}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {verificationLevel === 1 ? 
                  "You have basic verification. Link your GitHub account to increase your verification level." : 
                 verificationLevel === 2 ? 
                  "Your GitHub identity is verified. Verify repository ownership to reach the highest level." : 
                 verificationLevel === 3 ? 
                  "You have the highest verification level. You can create splits and distribute any amount." : 
                  "You need to verify your account to use GitSplits."}
              </p>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${verificationLevel * 33}%` }}></div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {verificationLevel < 2 && (
                  <Button onClick={() => setIsGitHubConnected(true)}>
                    <Github className="mr-2 h-4 w-4" /> Verify GitHub Identity
                  </Button>
                )}
                
                {verificationLevel === 2 && (
                  <Button>
                    <GitBranch className="mr-2 h-4 w-4" /> Verify Repository Ownership
                  </Button>
                )}
                
                <Button variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" /> Check Verification Status
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Verification Levels Explained</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-gray-100 p-2 rounded-full mr-4 flex-shrink-0">
                <span className="font-medium">1</span>
              </div>
              <div>
                <h3 className="font-medium">Basic Verification</h3>
                <p className="text-sm text-gray-600 mb-2">
                  X account age > 3 months, minimum followers
                </p>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Capabilities:</span> View splits, receive small distributions
                </div>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-full mr-4 flex-shrink-0">
                <span className="font-medium">2</span>
              </div>
              <div>
                <h3 className="font-medium">GitHub Verification</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Verified GitHub account connection
                </p>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Capabilities:</span> Receive distributions up to 1000 NEAR, create splits for your repositories
                </div>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-green-100 p-2 rounded-full mr-4 flex-shrink-0">
                <span className="font-medium">3</span>
              </div>
              <div>
                <h3 className="font-medium">Repository Verification</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Demonstrated repository control
                </p>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Capabilities:</span> Distribute any amount, create splits for any repository you control
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>How Verification Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 list-decimal list-inside">
            <li className="pl-2">
              <span className="font-medium">Tweet to verify your GitHub identity:</span>
              <div className="bg-gray-100 p-2 rounded mt-2 font-mono text-sm">
                @bankrbot @gitsplits verify your-github-username
              </div>
            </li>
            
            <li className="pl-2">
              <span className="font-medium">Add the verification code to your GitHub profile or create a repository with the code</span>
            </li>
            
            <li className="pl-2">
              <span className="font-medium">The agent will verify your identity and update your verification level</span>
            </li>
            
            <li className="pl-2">
              <span className="font-medium">For repository verification, you'll need admin permissions on the repository</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationCenter;
