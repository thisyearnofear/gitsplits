import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Github,
  DollarSign,
  Code,
  ArrowRight,
  Twitter,
  Share2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FeatureCardProps,
  StepCardProps,
  EnhancedAttributionWidgetProps,
  LandingPageProps,
} from "@types";
import RepoInfo from "@/components/dashboard/RepoInfo";
import AttributionWidget from "@/components/dashboard/AttributionWidget";
import SimplifiedSplitsSetup from "@/components/landing/SimplifiedSplitsSetup";
import EmbedCodeDisplay from "@/components/shared/EmbedCodeDisplay";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => (
  <Card className="p-6 hover:shadow-lg transition-shadow">
    <CardContent className="space-y-4 pt-4">
      <div className="text-blue-600">{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </CardContent>
  </Card>
);

const StepCard: React.FC<StepCardProps> = ({ number, title, description }) => (
  <div className="text-center space-y-4">
    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
      {number}
    </div>
    <h3 className="text-xl font-semibold">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const EnhancedAttributionWidget: React.FC<EnhancedAttributionWidgetProps> = ({
  repoInfo,
  contractAddress,
  displayStyle,
}) => {
  const [isExpanded, setIsExpanded] = useState(displayStyle === "expanded");

  return (
    <Card className="max-w-md w-full bg-white shadow-lg">
      <CardContent className="p-4">
        {/* Header section */}
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
            className="text-sm text-blue-600 hover:underline"
          >
            Star/Watch
          </a>
        </div>

        {/* Enhanced statistics section */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Tips</p>
              <p className="font-semibold">0.5 ETH</p>
              <p className="text-xs text-gray-500">($1,024.50)</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Contributors</p>
              <p className="font-semibold">12</p>
              <p className="text-xs text-gray-500">Active this month</p>
            </div>
          </div>
        </div>

        {/* Contributors list with enhanced UI */}
        <div className="space-y-2">
          {repoInfo.contributors.map((contributor) => (
            <div
              key={contributor.username}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2">
                <Image
                  src={`https://github.com/${contributor.username}.png`}
                  alt={contributor.username}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                {contributor.username}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">0.06 ETH earned</span>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced support button */}
        <div className="mt-4 pt-4 border-t">
          <Button className="w-full" size="sm">
            <DollarSign className="w-4 h-4 mr-2" />
            Tip Contributors (0.01 ETH)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({
  isConnected,
  onDashboardClick,
  onLoginPrompt,
}) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [showRepoInfo, setShowRepoInfo] = useState(false);
  const splitsSetupRef = useRef<HTMLDivElement>(null);
  const [autoRepoUrl, setAutoRepoUrl] = useState("");
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const [repoInfo, setRepoInfo] = useState<{
    owner: string;
    name: string;
  } | null>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [displayStyle, setDisplayStyle] = useState<"minimal" | "expanded">(
    "minimal"
  );

  useEffect(() => {
    // Any existing useEffect logic can remain here
  }, []);

  const handleSupportClick = () => {
    if (isConnected) {
      splitsSetupRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      onLoginPrompt();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/generate-embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl, contractAddress, displayStyle }),
      });

      if (response.ok) {
        const data = await response.json();
        setRepoInfo(data.repoInfo);
        setShowRepoInfo(true);
      } else {
        throw new Error("Failed to generate embed code");
      }
    } catch (error) {
      console.error("Error generating embed code:", error);
      toast({
        description: "Failed to generate embed code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAutoSetup = () => {
    if (autoRepoUrl) {
      localStorage.setItem("lastEnteredRepo", autoRepoUrl);
      handleDashboardNavigation();
    }
  };

  const handleDashboardNavigation = () => {
    if (isConnected) {
      onDashboardClick();
    } else {
      onLoginPrompt();
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add logic to handle email submission here
    console.log("Email submitted:", email);
    toast({ description: "Thank you for joining the waiting list!" });
    setEmail("");
  };

  // Add this near the top of your file
  const features = [
    {
      icon: <Github className="w-6 h-6" />,
      title: "GitHub Integration",
      description: "Seamlessly connect with your GitHub repositories.",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Automated Splits",
      description: "Fairly distribute contributions based on commit history.",
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: "Easy Embedding",
      description:
        "Embed attribution widgets in your project with a single line of code.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange">
      <div className="container mx-auto px-4 pt-20">
        {/* Existing header content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 py-16"
        >
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            GitSplits
          </h1>
          <p className="text-2xl text-gray-700 max-w-2xl mx-auto">
            Attribution. Open Source Splits. Onchain.
          </p>

          {isConnected && (
            <Button
              onClick={onDashboardClick}
              className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
            >
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {/* Repository Input */}
          <form onSubmit={handleSubmit} className="max-w-xl mx-auto mt-8">
            <div className="flex gap-2">
              <Input
                placeholder="Enter your GitHub repository URL"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
              />
              <Button type="submit" className="whitespace-nowrap">
                Generate Attribution
              </Button>
            </div>
          </form>

          {/* Email Waiting List Form */}
          <form onSubmit={handleEmailSubmit} className="max-w-xl mx-auto mt-8">
            <Input
              placeholder="Enter your email to join the waiting list"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" size="lg" variant="ghost" color="primary">
              Join Waiting List
            </Button>
          </form>

          {/* Quick Benefits */}
          <div className="flex justify-center space-x-8 mt-6">
            <span className="flex items-center text-sm text-gray-600">
              <Code className="w-4 h-4 mr-2" /> Easy Embed
            </span>
            <span className="flex items-center text-sm text-gray-600">
              <Github className="w-4 h-4 mr-2" /> Auto-sync with GitHub
            </span>
            <span className="flex items-center text-sm text-gray-600">
              <Share2 className="w-4 h-4 mr-2" /> Customizable Display
            </span>
          </div>
        </motion.div>

        {showRepoInfo && repoInfo && (
          <div className="flex flex-col items-center mt-8">
            <RepoInfo url={repoUrl} />
          </div>
        )}

        {/* How It Works Section */}
        <div className="py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Enter GitHub URL"
              description="Provide your repository URL to fetch contributor information"
            />
            <StepCard
              number="2"
              title="Customize Attribution"
              description="Choose between minimal and expanded display styles"
            />
            <StepCard
              number="3"
              title="Get Embed Code"
              description="Copy the generated code and add it to your project"
            />
          </div>
        </div>

        {/* Modified Enhanced Attribution Section */}
        <div className="py-16 bg-white rounded-lg shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-center">
                  Basic
                </h3>
                <AttributionWidget
                  repoInfo={{
                    owner: "torvalds",
                    name: "linux",
                    contributors: [
                      {
                        username: "torvalds",
                        contributions: 50,
                        avatar_url: "",
                      },
                      {
                        username: "gregkh",
                        contributions: 30,
                        avatar_url: "",
                      },
                    ],
                    isFork: false,
                    originalRepo: null,
                  }}
                  contractAddress=""
                  displayStyle="expanded"
                  onSupportClick={handleSupportClick}
                />
                {/* Rest of Basic card content */}
                <ul className="mt-4 space-y-2 text-gray-600">
                  <li>✓ MIT License frontend attribution</li>
                  <li>✓ Contributor recognition + kudos</li>
                  <li>✗ Support for donations, tips, royalties</li>
                  <li>✗ Onchain recognition of forked code </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-center">
                  Enhanced
                </h3>
                <EnhancedAttributionWidget
                  repoInfo={{
                    owner: "sindresorhus",
                    name: "awesome",
                    contributors: [
                      {
                        username: "sindresorhus",
                        contributions: 50,
                        avatar_url: "",
                      },
                      {
                        username: "johnjago",
                        contributions: 30,
                        avatar_url: "",
                      },
                    ],
                    isFork: false,
                    originalRepo: null,
                  }}
                  contractAddress="0x1234...5678"
                  displayStyle="expanded"
                />
                {/* Rest of Enhanced card content */}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="4"
              title="Add Splits"
              description="Use fork history to auto-split tips, donations, & royalties"
            />
            <StepCard
              number="5"
              title="Accept Onchain Contributions"
              description="Transparent, trustless transactions"
            />
            <StepCard
              number="6"
              title="Grow Community"
              description="Reward offchain devs, expand your network"
            />
          </div>
        </div>

        {/* Simplified GitSplits Setup */}
        <div className="py-16 mt-0" ref={splitsSetupRef}>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-center">
                Manual Setup
              </h3>
              <SimplifiedSplitsSetup
                onLoginRequired={onLoginPrompt}
                isConnected={isConnected}
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4 text-center">
                Automatic Setup
              </h3>
              <Card>
                <CardContent className="p-6">
                  <p className="mb-4">
                    Quickly set up splits for your repository with one click:
                  </p>
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter GitHub repository URL"
                      value={autoRepoUrl}
                      onChange={(e) => setAutoRepoUrl(e.target.value)}
                    />
                    <Button onClick={handleAutoSetup} className="w-full">
                      Generate Splits & Embed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Button
              onClick={handleDashboardNavigation}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
            >
              {isConnected ? "Go to Dashboard" : "Login to Access Dashboard"}{" "}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* New Footer Section */}
        <div className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4">
            {/* Testimonials */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600 italic mb-4">
                    "Good programmers know what to write. Great ones know what
                    to rewrite (and reuse)."
                  </p>
                  <p className="font-semibold">Eric S. Raymond</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600 italic mb-4">
                    "You have to be willing to take what you've done before,
                    what other people have done before, and rethink it."
                  </p>
                  <p className="font-semibold">Evan Williams</p>
                  <p className="text-sm text-gray-500">
                    Co-founder of Twitter and Medium
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Social Links */}
            <div className="flex justify-center space-x-6 mb-8">
              <a
                href="https://x.com/papajimjams"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm">
                  <Twitter className="w-5 h-5 mr-2" />
                  Twitter
                </Button>
              </a>
              <a
                href="https://github.com/thisyearnofear"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm">
                  <Github className="w-5 h-5 mr-2" />
                  GitHub
                </Button>
              </a>
              <a
                href="https://warpcast.com/papa"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm">
                  <span className="w-5 h-5 mr-2">🟣</span>
                  Farcaster
                </Button>
              </a>
            </div>

            {/* Bottom text */}
            <div className="text-center text-gray-600">
              <p>Built with ❤️ for the open source community</p>
              <p className="mt-2 text-sm">GitSplits</p>
            </div>
          </div>
        </div>

        {/* Add this inside your return statement, perhaps after the "How It Works" section */}
        <div className="py-16 mt-0">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
