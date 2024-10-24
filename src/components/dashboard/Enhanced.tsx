import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Code,
  Copy,
  ExternalLink,
  Github,
  Share2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EnhancedAttributionProps {
  repoUrl: string | null;
}

const EnhancedAttribution: React.FC<EnhancedAttributionProps> = ({
  repoUrl,
}) => {
  const [selectedStyle, setSelectedStyle] = useState("expanded");
  const [previewMode, setPreviewMode] = useState("light");

  // Use repoUrl to fetch repository data or display a message if no repo is selected
  if (!repoUrl) {
    return <div>Please select a repository from the Repositories tab.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Attribution Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="customize" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customize">Customize</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="embed">Embed</TabsTrigger>
            </TabsList>

            <TabsContent value="customize" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Display Style</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={
                        selectedStyle === "minimal" ? "default" : "outline"
                      }
                      onClick={() => setSelectedStyle("minimal")}
                      className="w-full"
                    >
                      Minimal
                    </Button>
                    <Button
                      variant={
                        selectedStyle === "expanded" ? "default" : "outline"
                      }
                      onClick={() => setSelectedStyle("expanded")}
                      className="w-full"
                    >
                      Expanded
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Theme</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={previewMode === "light" ? "default" : "outline"}
                      onClick={() => setPreviewMode("light")}
                      className="w-full"
                    >
                      Light
                    </Button>
                    <Button
                      variant={previewMode === "dark" ? "default" : "outline"}
                      onClick={() => setPreviewMode("dark")}
                      className="w-full"
                    >
                      Dark
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Onchain Features</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Minimum Tip Amount</span>
                      <Input
                        type="number"
                        placeholder="0.01"
                        className="w-24 text-right"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Default Split %</span>
                      <Input
                        type="number"
                        placeholder="100"
                        className="w-24 text-right"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button className="w-full" variant="outline">
                      <Github className="mr-2 h-4 w-4" />
                      Sync Contributors
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Share2 className="mr-2 h-4 w-4" />
                      Configure Splits
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div
                className={`p-4 rounded-lg ${
                  previewMode === "dark" ? "bg-gray-900" : "bg-white"
                }`}
              >
                <div className="w-full max-w-md mx-auto">
                  {/* Preview of the attribution widget would go here */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Github className="h-5 w-5" />
                        <span className="font-medium">username/repo</span>
                      </div>
                      <ExternalLink className="h-4 w-4" />
                    </div>
                    {selectedStyle === "expanded" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="font-medium">Total Tips</div>
                            <div>0.5 ETH</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="font-medium">Contributors</div>
                            <div>12</div>
                          </div>
                        </div>
                        <Button className="w-full">Tip Contributors</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="embed" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ready to embed</AlertTitle>
                <AlertDescription>
                  Copy and paste this code into your repository's README.md or
                  website.
                </AlertDescription>
              </Alert>

              <div className="relative">
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">
                    {`<script src="https://gitsplits.xyz/embed.js"></script>
<div 
  class="gitsplits-attribution" 
  data-repo="username/repo"
  data-style="${selectedStyle}"
  data-theme="${previewMode}"
></div>`}
                  </code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    /* Add copy logic */
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAttribution;
