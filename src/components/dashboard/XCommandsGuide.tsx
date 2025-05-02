import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Twitter,
  GitBranch,
  DollarSign,
  Github,
  Info,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const XCommandsGuide: React.FC = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Command copied to clipboard",
    });
  };

  const commandCategories = [
    {
      id: "analyze",
      name: "Analyze Repository",
      icon: <GitBranch className="h-4 w-4 text-blue-600" />,
      commands: [
        {
          name: "analyze",
          description: "Analyze repository contributions",
          format: "@gitsplits <repo>",
          example: "@gitsplits github.com/near/near-sdk-rs",
        },
      ],
    },
    {
      id: "create",
      name: "Create Split",
      icon: <DollarSign className="h-4 w-4 text-green-600" />,
      commands: [
        {
          name: "create split",
          description:
            "Create a split for a repository (default or custom allocation)",
          format: "@gitsplits create split <repo> [allocation]",
          example: "@gitsplits create split near/near-sdk-rs default",
        },
      ],
    },
    {
      id: "view",
      name: "View Splits",
      icon: <Info className="h-4 w-4 text-purple-600" />,
      commands: [
        {
          name: "splits",
          description: "View active splits for a repository",
          format: "@gitsplits splits <repo>",
          example: "@gitsplits splits near/near-sdk-rs",
        },
      ],
    },
    {
      id: "misc",
      name: "Miscellaneous",
      icon: <HelpCircle className="h-4 w-4 text-gray-600" />,
      commands: [
        {
          name: "help",
          description: "Show help message",
          format: "@gitsplits help",
          example: "@gitsplits help",
        },
      ],
    },
  ];

  const naturalLanguageExamples = [
    "@gitsplits github.com/torvalds/linux",
    "@gitsplits create split github.com/torvalds/linux default",
    "@gitsplits create split github.com/torvalds/linux 80/10/10",
    "@gitsplits splits github.com/near/near-sdk-rs",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="bg-blue-100 p-3 rounded-full">
          <Twitter className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">X Commands Guide</h2>
          <p className="text-gray-600">
            Interact with GitSplits using these commands on X/Twitter
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Command Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="repository">
            <TabsList className="grid w-full grid-cols-4">
              {commandCategories.map((category) => (
                <TabsTrigger key={category.id} value={category.id}>
                  <div className="flex items-center">
                    <span className="mr-2">{category.icon}</span>
                    <span>{category.name}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {commandCategories.map((category) => (
              <TabsContent key={category.id} value={category.id}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Command</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Example</TableHead>
                      <TableHead>Copy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.commands.map((command) => (
                      <TableRow key={command.name}>
                        <TableCell className="font-medium">
                          {command.name}
                        </TableCell>
                        <TableCell>{command.description}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {command.format}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {command.example}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(command.example)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Natural Language Support</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            The GitSplits X Agent understands natural language, so you can use
            more conversational commands:
          </p>
          <div className="space-y-2">
            {naturalLanguageExamples.map((example, index) => (
              <div
                key={index}
                className="bg-gray-100 p-2 rounded font-mono text-sm flex justify-between items-center"
              >
                <span>{example}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(example)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Command Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Repository References</h3>
              <p className="text-sm text-gray-600 mb-2">
                You can refer to repositories in several ways:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>
                  Full URL:{" "}
                  <span className="font-mono">github.com/user/repo</span>
                </li>
                <li>
                  Owner/name: <span className="font-mono">user/repo</span>
                </li>
                <li>
                  Just the name: <span className="font-mono">repo</span> (if
                  it's unambiguous)
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-1">Context Awareness</h3>
              <p className="text-sm text-gray-600">
                The agent remembers context from recent interactions, so you can
                use simpler follow-up commands.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Security Features</h3>
              <p className="text-sm text-gray-600">
                Higher-value actions (like large distributions) require higher
                verification levels.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Use X Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Post a tweet mentioning{" "}
              <span className="font-mono">@bankrbot @gitsplits</span> followed
              by your command
            </li>
            <li>The agent will process your command and reply to your tweet</li>
            <li>
              For commands that require funds, Bankrbot will handle the token
              transfers
            </li>
            <li>You can view all activity on this dashboard</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default XCommandsGuide;
