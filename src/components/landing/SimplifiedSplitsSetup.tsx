import React, { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { validateGitHubUsername } from "@/utils/api";

interface Contributor {
  username: string;
  percentage: number;
  error?: string;
  isValid?: boolean;
  id: string;
}

interface SimplifiedSplitsSetupProps {
  onLoginRequired: () => void;
  isConnected: boolean;
}

const SimplifiedSplitsSetup: React.FC<SimplifiedSplitsSetupProps> = ({
  onLoginRequired,
  isConnected,
}) => {
  const [contributors, setContributors] = useState<Contributor[]>([
    {
      username: "",
      percentage: 0,
      error: "",
      isValid: false,
      id: crypto.randomUUID(),
    },
  ]);
  const [hasInteracted, setHasInteracted] = useState(false); // Track user interaction

  const totalPercentage = useMemo(
    () =>
      contributors.reduce(
        (sum, contributor) => sum + contributor.percentage,
        0
      ),
    [contributors]
  );

  const hasErrors = useMemo(
    () =>
      contributors.some((c) => !c.isValid || c.percentage <= 0) ||
      totalPercentage !== 100,
    [contributors, totalPercentage]
  );

  const handleInteraction = useCallback(() => {
    if (!isConnected) {
      onLoginRequired();
    } else {
      setHasInteracted(true);
    }
  }, [isConnected, onLoginRequired]);

  const addContributor = useCallback(() => {
    handleInteraction();
    setContributors((prev) => [
      ...prev,
      { username: "", percentage: 0, isValid: false, id: crypto.randomUUID() },
    ]);
  }, [handleInteraction]);

  const removeContributor = useCallback((id: string) => {
    setContributors((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateContributor = useCallback(
    (id: string, field: keyof Contributor, value: string) => {
      handleInteraction();
      setContributors((prev) =>
        prev.map((contributor) => {
          if (contributor.id !== id) return contributor;

          if (field === "percentage") {
            const numValue = Math.min(Math.max(parseInt(value) || 0, 0), 100);
            return { ...contributor, [field]: numValue };
          }

          return { ...contributor, [field]: value };
        })
      );
    },
    [handleInteraction]
  );

  const validateGitHubUrl = useCallback(
    async (id: string) => {
      handleInteraction(); // Track interaction
      setContributors((prev) =>
        prev.map((contributor) => {
          if (contributor.id !== id) return contributor;

          const { username } = contributor;
          if (!username) {
            return {
              ...contributor,
              isValid: false,
              error: "Username required",
            };
          }

          return {
            ...contributor,
            isValid: false,
            error: "Validating...",
          };
        })
      );

      const contributorToValidate = contributors.find((c) => c.id === id);
      if (!contributorToValidate) return;

      try {
        const isValid = await validateGitHubUsername(
          contributorToValidate.username
        );
        setContributors((prev) =>
          prev.map((contributor) =>
            contributor.id === id
              ? {
                  ...contributor,
                  isValid,
                  error: isValid ? undefined : "Invalid GitHub username",
                }
              : contributor
          )
        );
      } catch {
        setContributors((prev) =>
          prev.map((contributor) =>
            contributor.id === id
              ? {
                  ...contributor,
                  isValid: false,
                  error: "Error validating username",
                }
              : contributor
          )
        );
      }
    },
    [contributors]
  );

  const redistributePercentages = useCallback(() => {
    const validContributors = contributors.filter((c) => c.isValid);
    if (validContributors.length === 0) return;

    const equalShare = Math.floor(100 / validContributors.length);
    const remainder = 100 - equalShare * validContributors.length;

    setContributors((prev) =>
      prev.map((contributor, index) => ({
        ...contributor,
        percentage: contributor.isValid
          ? equalShare + (index === 0 ? remainder : 0)
          : 0,
      }))
    );
  }, [contributors]);

  const handleSetupSplits = () => {
    if (isConnected) {
      // Implement the setup logic here
      console.log("Setting up splits with contributors:", contributors);
      // This would typically involve calling an API to create the contract
    } else {
      onLoginRequired();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        {contributors.map((contributor) => (
          <div
            key={contributor.id}
            className="flex items-center space-x-2 mb-2"
          >
            <Input
              placeholder="GitHub username"
              value={contributor.username}
              onChange={(e) =>
                updateContributor(contributor.id, "username", e.target.value)
              }
              onBlur={() => validateGitHubUrl(contributor.id)}
              className={`flex-grow ${
                contributor.error ? "border-red-500" : ""
              }`}
            />
            <Input
              type="number"
              placeholder="%"
              value={contributor.percentage || ""}
              onChange={(e) =>
                updateContributor(contributor.id, "percentage", e.target.value)
              }
              className="w-20"
            />
            {contributor.isValid && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {contributor.error && <XCircle className="h-4 w-4 text-red-500" />}
            {contributors.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeContributor(contributor.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <div className="flex justify-between items-center mt-4">
          <Button onClick={addContributor} className="mr-2">
            <Plus className="h-4 w-4 mr-2" /> Add Contributor
          </Button>
          <Button onClick={redistributePercentages} variant="outline">
            Split Evenly
          </Button>
        </div>
        {hasInteracted && (
          <div className="mt-4 text-center">
            <p
              className={`font-medium ${
                totalPercentage === 100 ? "text-green-600" : "text-amber-600"
              }`}
            >
              Total: {totalPercentage}%
              {totalPercentage !== 100 && " (must equal 100%)"}
            </p>
          </div>
        )}

        <Button
          onClick={handleSetupSplits}
          className="w-full mt-4"
          disabled={hasErrors || !hasInteracted}
        >
          {isConnected ? "Set Up Splits" : "Login to Set Up Splits"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SimplifiedSplitsSetup;
