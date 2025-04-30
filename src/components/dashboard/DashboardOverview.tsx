import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  DollarSign,
  Twitter,
  GitBranch,
  Github,
  Info,
  UserCheck,
  RefreshCw,
} from "lucide-react";

const DashboardOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Value Proposition Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Secure Attribution</h3>
            <p className="text-gray-600">
              Your contributions are securely verified and recorded on-chain for transparent attribution
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="bg-purple-100 p-3 rounded-full mb-4">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Fair Compensation</h3>
            <p className="text-gray-600">
              Receive your fair share based on quality-weighted contribution analysis
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="bg-green-100 p-3 rounded-full mb-4">
              <Twitter className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Simple Interaction</h3>
            <p className="text-gray-600">
              Manage everything through simple X commands - no complex interfaces needed
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="h-auto py-4 flex flex-col items-center justify-center">
              <GitBranch className="h-6 w-6 mb-2" />
              <span>Create a New Split</span>
              <span className="text-xs text-gray-400 mt-1">
                @bankrbot @gitsplits create your-repo
              </span>
            </Button>
            
            <Button className="h-auto py-4 flex flex-col items-center justify-center" variant="outline">
              <Github className="h-6 w-6 mb-2" />
              <span>Verify GitHub Identity</span>
              <span className="text-xs text-gray-400 mt-1">
                @bankrbot @gitsplits verify your-username
              </span>
            </Button>
            
            <Button className="h-auto py-4 flex flex-col items-center justify-center" variant="outline">
              <Info className="h-6 w-6 mb-2" />
              <span>Get Split Information</span>
              <span className="text-xs text-gray-400 mt-1">
                @bankrbot @gitsplits info your-repo
              </span>
            </Button>
            
            <Button className="h-auto py-4 flex flex-col items-center justify-center" variant="outline">
              <DollarSign className="h-6 w-6 mb-2" />
              <span>Distribute Funds</span>
              <span className="text-xs text-gray-400 mt-1">
                @bankrbot @gitsplits distribute 100 NEAR to your-repo
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-full mr-4">
                <GitBranch className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Split created for near/near-sdk-rs</p>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-green-100 p-2 rounded-full mr-4">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">100 NEAR distributed to 15 contributors</p>
                <p className="text-sm text-gray-500">4 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-purple-100 p-2 rounded-full mr-4">
                <UserCheck className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">johndoe verified GitHub identity</p>
                <p className="text-sm text-gray-500">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
