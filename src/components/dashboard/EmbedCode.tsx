import React from "react";
import { EmbedCodeProps } from "@/types";

export const EmbedCode: React.FC<EmbedCodeProps> = ({
  repoInfo,
  contractAddress,
  displayStyle,
}) => {
  const embedCode = `<iframe 
  src="${process.env.NEXT_PUBLIC_APP_URL}/embed?repo=${repoInfo.owner}/${
    repoInfo.name
  }&contract=${contractAddress}&style=${displayStyle}"
  width="100%"
  height="${displayStyle === "minimal" ? "100" : "300"}"
  frameborder="0"
></iframe>`;

  return (
    <div className="space-y-4 w-full max-w-md">
      <h3 className="text-center">Embed Code</h3>
      <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
        <code>{embedCode}</code>
      </pre>
    </div>
  );
};

export default EmbedCode;
