import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ArrowDown,
  ExternalLink,
  Github,
  Clock,
  CheckCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MyEarnings: React.FC = () => {
  const [earnings, setEarnings] = useState([
    {
      id: "dist-123",
      repoName: "near-sdk-rs",
      repoOwner: "near",
      amount: "30 NEAR",
      date: "2023-11-15",
      status: "completed",
      txHash: "0x123...abc",
    },
    {
      id: "dist-456",
      repoName: "near-api-js",
      repoOwner: "near",
      amount: "5 NEAR",
      date: "2023-11-02",
      status: "pending",
      txHash: null,
    },
  ]);

  const totalEarned = "35 NEAR";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Earned</p>
                <h3 className="text-2xl font-bold">{totalEarned}</h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Repositories</p>
                <h3 className="text-2xl font-bold">2</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Github className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Earnings</p>
                <h3 className="text-2xl font-bold">5 NEAR</h3>
              </div>
              <div className="bg-amber-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Earnings History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnings.map((earning) => (
                <TableRow key={earning.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <Github className="mr-2 h-4 w-4" />
                      {earning.repoOwner}/{earning.repoName}
                    </div>
                  </TableCell>
                  <TableCell>{earning.amount}</TableCell>
                  <TableCell>{earning.date}</TableCell>
                  <TableCell>
                    {earning.status === "completed" ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="mr-1 h-4 w-4" /> Completed
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-600">
                        <Clock className="mr-1 h-4 w-4" /> Pending
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {earning.txHash ? (
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline">
                        <ArrowDown className="h-4 w-4" /> Claim
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How Earnings Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-full mr-4 flex-shrink-0">
                <span className="font-medium">1</span>
              </div>
              <div>
                <h3 className="font-medium">Contribution Analysis</h3>
                <p className="text-sm text-gray-600">
                  When a split is created, your contributions are analyzed based on quality, impact, and longevity
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-full mr-4 flex-shrink-0">
                <span className="font-medium">2</span>
              </div>
              <div>
                <h3 className="font-medium">Fair Share Calculation</h3>
                <p className="text-sm text-gray-600">
                  Your percentage of the split is determined by your contribution quality relative to others
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-full mr-4 flex-shrink-0">
                <span className="font-medium">3</span>
              </div>
              <div>
                <h3 className="font-medium">Distribution</h3>
                <p className="text-sm text-gray-600">
                  When someone distributes funds, you receive a notification to claim your share
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-full mr-4 flex-shrink-0">
                <span className="font-medium">4</span>
              </div>
              <div>
                <h3 className="font-medium">Claiming</h3>
                <p className="text-sm text-gray-600">
                  Claim your earnings by connecting your wallet or replying to the notification
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyEarnings;
