import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  Users,
  GitFork,
  GitBranch,
  AlertCircle,
  Settings,
  Plus,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SplitsManager = () => {
  const [selectedRepo, setSelectedRepo] = useState("");
  const [splits, setSplits] = useState([
    { username: "alice", share: 40, contributions: 156, role: "maintainer" },
    { username: "bob", share: 35, contributions: 89, role: "contributor" },
    { username: "charlie", share: 25, contributions: 67, role: "contributor" },
  ]);

  const updateSplit = (username: string, newShare: number) => {
    setSplits((prevSplits) =>
      prevSplits.map((split) =>
        split.username === username ? { ...split, share: newShare } : split
      )
    );
  };

  useEffect(() => {
    const totalShare = splits.reduce((sum, split) => sum + split.share, 0);
    if (totalShare !== 100) {
      // Normalize shares to add up to 100
      const normalizedSplits = splits.map((split) => ({
        ...split,
        share: Math.round((split.share / totalShare) * 100),
      }));
      setSplits(normalizedSplits);
    }
  }, [splits]);

  return (
    <div className="space-y-6">
      {/* Repository Selection */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Repository Tips & Splits</CardTitle>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Repository
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={selectedRepo} onValueChange={setSelectedRepo}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a repository" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="repo1">your-org/awesome-project</SelectItem>
              <SelectItem value="repo2">your-org/another-project</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Total Tips</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col mt-2">
              <span className="text-2xl font-bold">1.2 ETH</span>
              <span className="text-xs text-muted-foreground">≈ $2,400</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Contributors</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col mt-2">
              <span className="text-2xl font-bold">15</span>
              <span className="text-xs text-muted-foreground">
                Active this month
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Fork Attribution</p>
              <GitFork className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col mt-2">
              <span className="text-2xl font-bold">3</span>
              <span className="text-xs text-muted-foreground">
                Connected forks
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Tip Rate</p>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col mt-2">
              <span className="text-2xl font-bold">0.05 ETH</span>
              <span className="text-xs text-muted-foreground">
                Average per tip
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Split Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Split Distribution</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <GitBranch className="mr-2 h-4 w-4" />
                Sync with GitHub
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contributor</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contributions</TableHead>
                <TableHead>Split %</TableHead>
                <TableHead>Earned</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {splits.map((split) => (
                <TableRow key={split.username}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://github.com/${split.username}.png`}
                        alt={split.username}
                        className="w-6 h-6 rounded-full"
                      />
                      {split.username}
                    </div>
                  </TableCell>
                  <TableCell>{split.role}</TableCell>
                  <TableCell>{split.contributions}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={split.share}
                      className="w-20"
                      min="0"
                      max="100"
                      onChange={(e) =>
                        updateSplit(split.username, Number(e.target.value))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {((split.share / 100) * 1.2).toFixed(2)} ETH
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-between items-center">
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Contributor
            </Button>
            <div className="text-sm text-muted-foreground">
              Total Distribution: 100%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tip History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tipper</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Split Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2024-10-22</TableCell>
                <TableCell>0x1234...5678</TableCell>
                <TableCell>0.1 ETH</TableCell>
                <TableCell>
                  <span className="text-green-600">Distributed</span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2024-10-21</TableCell>
                <TableCell>0xabcd...efgh</TableCell>
                <TableCell>0.05 ETH</TableCell>
                <TableCell>
                  <span className="text-green-600">Distributed</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SplitsManager;
