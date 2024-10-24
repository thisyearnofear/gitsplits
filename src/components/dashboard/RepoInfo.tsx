// components/dashboard/RepoInfo.tsx

import React, { useState, useEffect } from "react";
import { RepoInfo as RepoInfoType } from "@/types";
import AttributionWidget from "@/components/dashboard/AttributionWidget";
import EmbedCodeDisplay from "@/components/shared/EmbedCodeDisplay";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRepoInfo } from "@/utils/api"; // Import the utility function

interface RepoInfoProps {
  url: string;
}

const RepoInfo: React.FC<RepoInfoProps> = ({ url }) => {
  const [repoInfo, setRepoInfo] = useState<RepoInfoType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayStyle, setDisplayStyle] = useState<"minimal" | "expanded">(
    "expanded"
  );
  const [contractAddress, setContractAddress] = useState(
    "0x1234567890123456789012345678901234567890"
  );

  useEffect(() => {
    const fetchRepoInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const info = await getRepoInfo(url);
        setRepoInfo(info);
      } catch (error) {
        setError(
          "Failed to fetch repository information. Please check the URL."
        );
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchRepoInfo();
    }
  }, [url]);

  if (loading) {
    return (
      <div className="text-center py-8">Loading repository information...</div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (!repoInfo) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto mt-0 px-4">
      <div className="flex justify-center space-x-2 mb-4">
        <Button
          variant={displayStyle === "minimal" ? "default" : "outline"}
          onClick={() => setDisplayStyle("minimal")}
        >
          Minimal
        </Button>
        <Button
          variant={displayStyle === "expanded" ? "default" : "outline"}
          onClick={() => setDisplayStyle("expanded")}
        >
          Expanded
        </Button>
      </div>
      <Tabs defaultValue="preview" className="w-full">
        <div className="flex justify-center mb-4">
          <AttributionWidget
            repoInfo={repoInfo}
            contractAddress={contractAddress}
            displayStyle={displayStyle}
            onSupportClick={function (): void {
              throw new Error("Function not implemented.");
            }}
          />
        </div>
        <div className="flex justify-center mt-4 mb-4">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="embed">Embed Code</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="preview" className="flex justify-center">
          {/* Preview content is now above the tabs */}
        </TabsContent>
        <TabsContent value="embed" className="flex justify-center">
          <EmbedCodeDisplay
            repoInfo={{
              owner: repoInfo.owner,
              name: repoInfo.name,
            }}
            contractAddress={contractAddress}
            displayStyle={displayStyle}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RepoInfo;
