import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Github,
  DollarSign,
  Code,
  ArrowRight,
  Twitter,
  Share2,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useNearWallet } from "@/hooks/useNearWallet";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
    "minimal",
  );

  // NEAR wallet integration
  const {
    isConnected: isNearConnected,
    accountId: nearAccountId,
    connect: connectNear,
  } = useNearWallet();

  // Combined connection status - connected to either wallet
  const isAnyWalletConnected = isConnected || isNearConnected;

  const router = useRouter();

  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  useEffect(() => {
    // If any wallet is connected, we can automatically navigate to dashboard
    if (isAnyWalletConnected) {
      // Ready for dashboard navigation
    }
  }, [isConnected, isNearConnected, isAnyWalletConnected]);

  const handleSupportClick = () => {
    if (isConnected) {
      splitsSetupRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      onLoginPrompt();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Debugging: Log the values before making the request
    console.log("repoUrl:", repoUrl);
    console.log("displayStyle:", displayStyle);

    try {
      // Check if all required fields are set
      if (!repoUrl || !displayStyle) {
        throw new Error("Missing required fields");
      }

      const response = await fetch("/api/generate-embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl, displayStyle }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Repo Info:", data.repoInfo); // Debugging
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
    setIsDashboardLoading(true);
    if (isAnyWalletConnected) {
      onDashboardClick();
    } else {
      showWalletSelectionModal();
      setIsDashboardLoading(false);
    }
  };

  // Function to show wallet selection modal
  const [showWalletModal, setShowWalletModal] = useState(false);

  const showWalletSelectionModal = () => {
    setShowWalletModal(true);
  };

  const handleEVMLogin = () => {
    setShowWalletModal(false);
    onLoginPrompt(); // Original EVM login flow
  };

  const handleNEARLogin = async () => {
    setShowWalletModal(false);
    try {
      await connectNear();

      // Add a delay to allow the connection state to update
      setTimeout(() => {
        // Navigate to dashboard regardless of the current connection state
        // The connection state might not be updated immediately
        onDashboardClick();
      }, 2000);
    } catch (error) {
      toast({
        description: "Failed to connect to NEAR wallet. Please try again.",
        variant: "destructive",
      });
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
      icon: <Twitter className="w-6 h-6" />,
      title: "Agentic Commands",
      description:
        "Analyze, create splits, pay, and verify with a single message or API call.",
    },
    {
      icon: <Share2 className="w-6 h-6" />,
      title: "Attribution Widgets",
      description:
        "Publish embeddable contributor attribution for any repository.",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Cross-Chain Payouts",
      description:
        "Route payouts via NEAR + EVM wallets with intent-based settlement.",
    },
  ];

  const steps = [
    {
      number: 1,
      title: "Connect and Verify",
      description: "Link your wallet and verify GitHub ownership once.",
    },
    {
      number: 2,
      title: "Analyze and Split",
      description: "Pull real repo data to generate fair splits automatically.",
    },
    {
      number: 3,
      title: "Pay Contributors",
      description: "Send payouts with one command or through the dashboard.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange">
      {/* Wallet Selection Modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Wallet</DialogTitle>
            <DialogDescription>
              Choose a wallet to connect to GitSplits
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={handleEVMLogin}
            >
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 784 784"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M392 784C608.5 784 784 608.5 784 392C784 175.5 608.5 0 392 0C175.5 0 0 175.5 0 392C0 608.5 175.5 784 392 784Z"
                      fill="#627EEA"
                    />
                    <path
                      d="M392 100V315L587 400L392 100Z"
                      fill="white"
                      fillOpacity="0.6"
                    />
                    <path d="M392 100L197 400L392 315V100Z" fill="white" />
                    <path
                      d="M392 539V684L587 432L392 539Z"
                      fill="white"
                      fillOpacity="0.6"
                    />
                    <path d="M392 684V539L197 432L392 684Z" fill="white" />
                    <path
                      d="M392 505L587 400L392 315V505Z"
                      fill="white"
                      fillOpacity="0.2"
                    />
                    <path
                      d="M197 400L392 505V315L197 400Z"
                      fill="white"
                      fillOpacity="0.6"
                    />
                  </svg>
                </div>
                <h3 className="font-medium text-lg">EVM Wallet</h3>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Connect with MetaMask, WalletConnect, or other EVM wallets
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={handleNEARLogin}
            >
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z"
                      fill="#000000"
                    />
                    <path
                      d="M21.2105 9.15789L18.1053 14.0211L17.6842 14.7368L13.8947 21.0526L10.7895 15.7895H8L13.8947 26.5263L21.2105 14.0211V22.1053H24V9.15789H21.2105Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <h3 className="font-medium text-lg">NEAR Wallet</h3>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Connect with Bitte Wallet for NEAR blockchain operations
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

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
            Agentic payouts for open source contributors.
          </p>

          {isAnyWalletConnected && (
            <Button
              onClick={() => router.push("/dashboard")}
              className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
            >
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {!isAnyWalletConnected && (
            <Button
              onClick={showWalletSelectionModal}
              className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
            >
              Connect Wallet <Wallet className="ml-2 h-4 w-4" />
            </Button>
          )}

          {/* Attribution/Feature List Section - moved here */}
          <div className="mt-8">
            <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
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
          </div>
        </motion.div>

        {showRepoInfo && repoInfo && (
          <div className="flex flex-col items-center mt-8">
            <RepoInfo url={repoUrl} />
          </div>
        )}

        {/* How It Works Section */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">
              How It Works
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Connect a wallet, analyze a repo, and route payouts in minutes.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <StepCard
                  key={index}
                  number={step.number.toString()}
                  title={step.title}
                  description={step.description}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">
              Key Features
            </h2>

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
                    <div className="flex gap-4">
                      <Button
                        onClick={handleAutoSetup}
                        size="lg"
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Try Agent Commands <Twitter className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        onClick={handleDashboardNavigation}
                        size="lg"
                        variant="outline"
                      >
                        Use Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
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
              disabled={isDashboardLoading}
            >
              {isDashboardLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    ></path>
                  </svg>
                  Loading...
                </span>
              ) : isAnyWalletConnected ? (
                <>
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Connect Wallet to Access Dashboard{" "}
                  <Wallet className="ml-2 h-4 w-4" />
                </>
              )}
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

            {/* Email Waiting List Form */}
            <form
              onSubmit={handleEmailSubmit}
              className="max-w-xl mx-auto mt-8 flex flex-col items-center"
            >
              <Input
                placeholder="Enter your email for updates"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-center"
              />
              <Button
                type="submit"
                size="lg"
                variant="ghost"
                color="primary"
                className="text-center"
              ></Button>
            </form>

            {/* Bottom text */}
            <div className="text-center text-gray-600">
              <p>
                Built with ❤️ by{" "}
                <a
                  href="https://warpcast.com/papa"
                  className="text-blue-600 hover:underline"
                >
                  papa
                </a>
              </p>
              <p className="mt-2 text-sm">
                Built on EigenCloud, OpenClaw & NEAR
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
