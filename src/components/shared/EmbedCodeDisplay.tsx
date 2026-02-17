import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateEmbedCode } from "@/lib/services/embed";
import { useToast } from "@/hooks/use-toast";

interface EmbedCodeDisplayProps {
  repoInfo: { owner: string; name: string };
  displayStyle: "minimal" | "expanded";
}

const EmbedCodeDisplay: React.FC<EmbedCodeDisplayProps> = ({
  repoInfo,
  displayStyle,
}) => {
  const { toast } = useToast();
  const embedCode = generateEmbedCode(repoInfo, displayStyle);
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(embedCode)
      .then(() => {
        setIsCopied(true);
        toast({
          description: "Embed code copied to clipboard!",
          duration: 3000,
        });
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        toast({
          description: "Failed to copy embed code. Please try again.",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">🤝</h3>
      <pre className="bg-white p-2 rounded overflow-x-auto text-sm">
        <code>{embedCode}</code>
      </pre>
      <Button onClick={copyToClipboard} className="mt-2">
        {isCopied ? "Copied!" : "Copy to Clipboard"}
      </Button>
    </div>
  );
};

export default EmbedCodeDisplay;
