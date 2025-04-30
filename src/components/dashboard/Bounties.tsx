import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, CheckCircle, Clock } from "lucide-react";

const mockBounties = [
  {
    id: "bounty-001",
    title: "Add TypeScript support to repo",
    repo: "near/near-sdk-rs",
    amount: "20 NEAR",
    status: "open",
    deadline: "2025-05-10",
  },
  {
    id: "bounty-002",
    title: "Improve documentation",
    repo: "near/near-api-js",
    amount: "10 NEAR",
    status: "claimed",
    deadline: "2025-05-05",
  },
];

const Bounties: React.FC = () => {
  const [bounties, setBounties] = useState(mockBounties);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bounties & Incentives</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Bounty
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Available Bounties</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bounties.map((bounty) => (
                <TableRow key={bounty.id}>
                  <TableCell>{bounty.title}</TableCell>
                  <TableCell>{bounty.repo}</TableCell>
                  <TableCell>{bounty.amount}</TableCell>
                  <TableCell>
                    {bounty.status === "open" ? (
                      <Badge className="bg-green-500">Open</Badge>
                    ) : (
                      <Badge className="bg-amber-500">Claimed</Badge>
                    )}
                  </TableCell>
                  <TableCell>{bounty.deadline}</TableCell>
                  <TableCell>
                    {bounty.status === "open" ? (
                      <Button size="sm" variant="outline">
                        <CheckCircle className="h-4 w-4 mr-1" /> Claim
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        <Clock className="h-4 w-4 mr-1" /> Pending
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Bounties;
