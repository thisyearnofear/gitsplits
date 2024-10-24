import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Github,
  GitFork,
  DollarSign,
  Users,
  ExternalLink,
  Search,
  ArrowRight,
} from "lucide-react";
import EnhancedAttribution from "@/components/dashboard/Enhanced";
import DashboardSplitsManager from "@/components/dashboard/SplitsManager";
import { DashboardProps, RepoCardProps, SplitsTableProps } from "@/types";
import { useToast } from "@/hooks/use-toast";

const Dashboard: React.FC<DashboardProps> = ({
  isGitHubConnected,
  setIsGitHubConnected,
}) => {
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
  const [lastEnteredRepo, setLastEnteredRepo] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<Record<string, any> | null>(null);
  const [contributors, setContributors] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const storedRepo = localStorage.getItem("lastEnteredRepo");
    if (storedRepo) {
      setLastEnteredRepo(storedRepo);
      setActiveRepo(storedRepo);
      localStorage.removeItem("lastEnteredRepo");
    }
  }, []);

  const fetchRepoInfo = async () => {
    if (!activeRepo) {
      toast({
        title: "Error",
        description: "Please enter a valid GitHub repository URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const [, , , owner, name] = activeRepo.split("/");
      const repoResponse = await fetch(
        `https://api.github.com/repos/${owner}/${name}`
      );
      const contributorsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${name}/contributors`
      );

      if (!repoResponse.ok || !contributorsResponse.ok)
        throw new Error("Failed to fetch repository info");

      const repoData = await repoResponse.json();
      const contributorsData = await contributorsResponse.json();

      setRepoInfo(repoData);
      setContributors(contributorsData);
      setActiveStep(2);
      toast({
        title: "Success",
        description: "Repository information fetched successfully",
      });
    } catch (error) {
      console.error("Error fetching repo info:", error);
      toast({
        title: "Error",
        description: "Failed to fetch repository information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSplits = (contributors: Record<string, any>[]) => {
    const totalContributions = contributors.reduce(
      (sum, contributor) => sum + contributor.contributions,
      0
    );
    return contributors.map((contributor) => ({
      avatar_url: contributor.avatar_url,
      login: contributor.login,
      contributions: contributor.contributions,
      percentage: (
        (contributor.contributions / totalContributions) *
        100
      ).toFixed(2),
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange">
      <div className="container mx-auto px-4 py-8">
        {!isGitHubConnected && (
          <Card className="mb-6">
            <CardContent className="flex items-center justify-between p-4">
              <p>Connect your GitHub account to get started</p>
              <Button onClick={() => setIsGitHubConnected(true)} disabled>
                <Github className="mr-2 h-4 w-4" /> Connect GitHub (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="repositories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="repositories">Repositories</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
            <TabsTrigger value="splits">Splits</TabsTrigger>
          </TabsList>

          <TabsContent value="repositories">
            <div className="grid gap-6">
              <Card
                className={`relative ${
                  activeStep === 1 ? "ring-2 ring-green-500" : ""
                }`}
              >
                <CardHeader>
                  <CardTitle>Step 1: Select Repository</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lastEnteredRepo && (
                      <RepoCard
                        name={lastEnteredRepo.split("/").pop() || ""}
                        owner={lastEnteredRepo.split("/")[3] || ""}
                        stats={{
                          tips: "0 ETH",
                          contributors: 0,
                          forks: 0,
                        }}
                        onSelect={() => setActiveRepo(lastEnteredRepo)}
                      />
                    )}
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter GitHub repository URL"
                        value={activeRepo || ""}
                        onChange={(e) => setActiveRepo(e.target.value)}
                      />
                      <Button onClick={fetchRepoInfo} disabled={isLoading}>
                        {isLoading ? (
                          "Loading..."
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {repoInfo && (
                      <RepoCard
                        name={repoInfo.name}
                        owner={repoInfo.owner.login}
                        stats={{
                          tips: "0 ETH",
                          contributors: repoInfo.subscribers_count,
                          forks: repoInfo.forks_count,
                        }}
                        onSelect={() => {}}
                      />
                    )}
                  </div>
                </CardContent>
                {activeStep === 1 && (
                  <div className="absolute -bottom-8 right-4 text-green-500 flex items-center">
                    <span className="mr-2">
                      After Search, Next: View Contributors
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Card>

              {contributors.length > 0 && (
                <Card
                  className={`relative ${
                    activeStep === 2 ? "ring-2 ring-green-500" : ""
                  }`}
                >
                  <CardHeader>
                    <CardTitle>
                      Step 2: Review Contributors and Splits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SplitsTable splits={calculateSplits(contributors)} />
                  </CardContent>
                  {activeStep === 2 && (
                    <div className="absolute -bottom-8 right-4 text-green-500 flex items-center">
                      <span className="mr-2">
                        Next: Set Up Attribution (click tab above)
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="attribution">
            <Card
              className={`relative ${
                activeStep === 3 ? "ring-2 ring-green-500" : ""
              }`}
            >
              <CardHeader>
                <CardTitle>Step 3: Set Up Attribution</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedAttribution repoUrl={activeRepo} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="splits">
            <Tabs defaultValue="manage">
              <TabsList>
                <TabsTrigger value="manage">Manage Splits</TabsTrigger>
                <TabsTrigger value="example">Example Contract</TabsTrigger>
              </TabsList>
              <TabsContent value="manage">
                <DashboardSplitsManager />
              </TabsContent>
              <TabsContent value="example"></TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const RepoCard: React.FC<RepoCardProps> = ({
  name,
  owner,
  stats,
  onSelect,
}) => (
  <Card
    className="hover:shadow-md transition-shadow cursor-pointer"
    onClick={onSelect}
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Github className="h-5 w-5" />
          <span className="font-medium">
            {owner}/{name}
          </span>
        </div>
        <ExternalLink className="h-4 w-4 text-gray-400" />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <DollarSign className="h-4 w-4" />
          <span>{stats.tips}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Users className="h-4 w-4" />
          <span>{stats.contributors}</span>
        </div>
        <div className="flex items-center space-x-1">
          <GitFork className="h-4 w-4" />
          <span>{stats.forks}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const SplitsTable: React.FC<SplitsTableProps> = ({ splits }) => (
  <div className="border rounded-lg">
    <div className="grid grid-cols-3 gap-4 p-4 border-b font-medium">
      <div>Contributor</div>
      <div>Contributions</div>
      <div>Split Percentage</div>
    </div>
    {splits.map((split, i) => (
      <div
        key={i}
        className="grid grid-cols-3 gap-4 p-4 border-b last:border-0"
      >
        <div className="flex items-center space-x-2">
          <img
            src={split.avatar_url}
            alt={split.login}
            className="w-6 h-6 rounded-full"
          />
          <span>{split.login}</span>
        </div>
        <div>{split.contributions}</div>
        <div>{split.percentage}%</div>
      </div>
    ))}
  </div>
);

export default Dashboard;
