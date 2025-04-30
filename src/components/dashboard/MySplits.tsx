import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GitBranch,
  DollarSign,
  Users,
  ExternalLink,
  Plus,
  Github,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MySplits: React.FC = () => {
  const [splits, setSplits] = useState([
    {
      id: "split-123",
      repoName: "near-sdk-rs",
      repoOwner: "near",
      contributors: 15,
      totalDistributed: "250 NEAR",
      createdAt: "2023-10-15",
      yourShare: "12%",
    },
    {
      id: "split-456",
      repoName: "near-api-js",
      repoOwner: "near",
      contributors: 8,
      totalDistributed: "100 NEAR",
      createdAt: "2023-11-02",
      yourShare: "5%",
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Splits</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create New Split
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Splits You Created</CardTitle>
        </CardHeader>
        <CardContent>
          {splits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Contributors</TableHead>
                  <TableHead>Total Distributed</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {splits.map((split) => (
                  <TableRow key={split.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Github className="mr-2 h-4 w-4" />
                        {split.repoOwner}/{split.repoName}
                      </div>
                    </TableCell>
                    <TableCell>{split.contributors}</TableCell>
                    <TableCell>{split.totalDistributed}</TableCell>
                    <TableCell>{split.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <GitBranch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Splits Created Yet</h3>
              <p className="text-gray-500 mb-4">
                You haven't created any splits for your repositories yet.
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create Your First Split
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Splits You Contribute To</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Your Share</TableHead>
                <TableHead>Total Distributed</TableHead>
                <TableHead>Contributors</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {splits.map((split) => (
                <TableRow key={`contrib-${split.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <Github className="mr-2 h-4 w-4" />
                      {split.repoOwner}/{split.repoName}
                    </div>
                  </TableCell>
                  <TableCell>{split.yourShare}</TableCell>
                  <TableCell>{split.totalDistributed}</TableCell>
                  <TableCell>{split.contributors}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Create a Split</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 list-decimal list-inside">
            <li className="pl-2">
              <span className="font-medium">Verify your GitHub identity (if you haven't already)</span>
            </li>
            <li className="pl-2">
              <span className="font-medium">Tweet to create a split:</span>
              <div className="bg-gray-100 p-2 rounded mt-2 font-mono text-sm">
                @bankrbot @gitsplits create your-repo
              </div>
            </li>
            <li className="pl-2">
              <span className="font-medium">The agent will analyze contributions and create a fair split</span>
            </li>
            <li className="pl-2">
              <span className="font-medium">Distribute funds to contributors:</span>
              <div className="bg-gray-100 p-2 rounded mt-2 font-mono text-sm">
                @bankrbot @gitsplits distribute 100 NEAR to your-repo
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default MySplits;
