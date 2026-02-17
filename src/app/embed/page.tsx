"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getRepoInfo } from "@/lib/services/api";
import AttributionWidget from "@/components/dashboard/AttributionWidget";
import { RepoInfo } from "@/types";

export default function EmbedPage() {
  const searchParams = useSearchParams();
  const repo = searchParams.get("repo");
  const contract = searchParams.get("contract") || "";
  const style =
    (searchParams.get("style") as "minimal" | "expanded") || "minimal";
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);

  useEffect(() => {
    if (repo) {
      getRepoInfo(`https://github.com/${repo}`).then((info) =>
        setRepoInfo(info)
      );
    }
  }, [repo]);

  if (!repoInfo) return <div>Loading...</div>;

  return (
    <AttributionWidget
      repoInfo={repoInfo}
      contractAddress={contract}
      displayStyle={style}
      onSupportClick={() => {}}
    />
  );
}
