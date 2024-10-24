import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Share2, GitFork, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AttributionWidgetProps } from "@/types";
import Image from "next/image";

const AttributionWidget: React.FC<AttributionWidgetProps> = ({
  repoInfo,
  contractAddress,
  displayStyle,
  onSupportClick,
}) => {
  const isExpanded = displayStyle === "expanded";

  const totalContributions = repoInfo.contributors.reduce(
    (sum, contributor) => sum + contributor.contributions,
    0
  );

  return (
    <Card className="max-w-md w-full bg-white shadow-lg">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Github className="w-5 h-5" />
            <h3 className="font-semibold">
              {repoInfo.owner}/{repoInfo.name}
            </h3>
          </div>
          <a
            href={`https://github.com/${repoInfo.owner}/${repoInfo.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center"
          >
            <Star className="w-4 h-4 mr-1" />
            Star/Watch
          </a>
        </div>

        {/* Original Repository Info (if forked) */}
        {repoInfo.isFork && repoInfo.originalRepo && (
          <div className="text-sm text-gray-600 mb-4">
            <span className="flex items-center gap-1">
              <GitFork className="w-4 h-4" />
              Forked from {repoInfo.originalRepo.owner}/
              {repoInfo.originalRepo.name}
            </span>
          </div>
        )}

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Contributors List */}
              <div className="space-y-2 mt-4">
                {repoInfo.contributors.map((contributor) => (
                  <div
                    key={contributor.username}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Image
                        src={`https://github.com/${contributor.username}.png`}
                        alt={contributor.username}
                        width={36}
                        height={36}
                        className="w-6 h-6 rounded-full"
                      />
                      {contributor.username}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{
                            width: `${
                              (contributor.contributions / totalContributions) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-gray-600 w-12 text-right">
                        {(
                          (contributor.contributions / totalContributions) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Donation Section */}
              {contractAddress && (
                <div className="mt-4 pt-4 border-t">
                  <Button className="w-full" size="sm" onClick={onSupportClick}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Support Contributors
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default AttributionWidget;
