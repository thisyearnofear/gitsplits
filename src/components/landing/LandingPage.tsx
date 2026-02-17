import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Github,
  DollarSign,
  Code,
  ArrowRight,
  Twitter,
  Share2,
  Wallet,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Rocket,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FeatureCardProps, StepCardProps, LandingPageProps } from "@types";
import RepoInfo from "@/components/dashboard/RepoInfo";
import { useToast } from "@/hooks/use-toast";
import { useNearWallet } from "@/hooks/useNearWallet";
import { WalletSelector } from "@/components/shared/WalletSelector";
import { useRouter } from "next/navigation";

// Animated stats component for social proof
const HeroStats: React.FC = () => {
  const stats = [
    { icon: <Users className="w-5 h-5" />, value: "2,500+", label: "Contributors" },
    { icon: <DollarSign className="w-5 h-5" />, value: "$1.2M", label: "Distributed" },
    { icon: <Github className="w-5 h-5" />, value: "500+", label: "Repositories" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="flex flex-wrap justify-center gap-6 mt-10"
    >
      {stats.map((stat, index) => (
        <div
          key={index}
          className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-sm border border-white/50"
        >
          <div className="text-blue-600">{stat.icon}</div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-gray-900 text-lg">{stat.value}</span>
            <span className="text-gray-500 text-sm">{stat.label}</span>
          </div>
        </div>
      ))}
    </motion.div>
  );
};

// Value proposition cards with hover effects
const ValuePropCards: React.FC = () => {
  const cards = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "One Command Payouts",
      description: "Pay all contributors in seconds with a single agentic command",
      color: "bg-amber-100 text-amber-600",
      hoverColor: "hover:border-amber-300",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Verifiable & Transparent",
      description: "Every contribution tracked on-chain with full attribution",
      color: "bg-emerald-100 text-emerald-600",
      hoverColor: "hover:border-emerald-300",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "AI-Powered Splits",
      description: "Smart analysis of commits, reviews, and issues for fair splits",
      color: "bg-violet-100 text-violet-600",
      hoverColor: "hover:border-violet-300",
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="grid md:grid-cols-3 gap-4 mt-10 max-w-4xl mx-auto"
    >
      {cards.map((card, index) => (
        <motion.div
          key={index}
          whileHover={{ scale: 1.02, y: -4 }}
          className={`bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border-2 border-transparent ${card.hoverColor} transition-all cursor-pointer`}
        >
          <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center mb-4 shadow-sm`}>
            {card.icon}
          </div>
          <h4 className="font-bold text-gray-900 mb-2">{card.title}</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{card.description}</p>
        </motion.div>
      ))}
    </motion.div>
  );
};

// Floating badge component
const FloatingBadge: React.FC<{ children: React.ReactNode; delay: number; className?: string }> = ({ 
  children, 
  delay,
  className = "" 
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

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

const LandingPage: React.FC<LandingPageProps> = ({
  isConnected,
  onDashboardClick,
  onLoginPrompt,
}) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [showRepoInfo, setShowRepoInfo] = useState(false);
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const [repoInfo, setRepoInfo] = useState<{
    owner: string;
    name: string;
  } | null>(null);
  const [displayStyle] = useState<"minimal" | "expanded">("minimal");

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

  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleTryAgent = () => {
    if (isAnyWalletConnected) {
      router.push("/agent");
    } else {
      setShowWalletModal(true);
    }
  };

  const handleDashboardNavigation = () => {
    setIsDashboardLoading(true);
    if (isAnyWalletConnected) {
      onDashboardClick();
    } else {
      setShowWalletModal(true);
      setIsDashboardLoading(false);
    }
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
      title: "X + Agent Commands",
      description:
        "Analyze repos, create splits, pay, and verify through X or the agent console.",
    },
    {
      icon: <Share2 className="w-6 h-6" />,
      title: "Attribution Widgets",
      description:
        "Generate embeddable attribution for any repository with live GitHub data.",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Splits and Payouts",
      description:
        "Create contributor splits and send payouts from the dashboard or commands.",
    },
  ];

  const steps = [
    {
      number: 1,
      title: "Connect and Verify",
      description: "Connect a wallet and verify your GitHub or X identity.",
    },
    {
      number: 2,
      title: "Analyze and Split",
      description: "Analyze repo contributions to generate suggested splits.",
    },
    {
      number: 3,
      title: "Distribute and Track",
      description: "Send payouts and monitor activity in the dashboard.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange">
      <WalletSelector
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelectEVM={handleEVMLogin}
        onSelectNEAR={handleNEARLogin}
      />

      <div className="container mx-auto px-4 pt-20">
        {/* Redesigned Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 py-12"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 text-sm text-blue-700 mb-4"
          >
            <Rocket className="w-4 h-4" />
            <span>Now live on mainnet</span>
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-300% animate-gradient">
            GitSplits
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            The autonomous agent that pays open-source contributors fairly.{" "}
            <span className="font-semibold text-purple-600">Analyze → Split → Pay</span> in minutes.
          </p>

          {/* Animated Stats */}
          <HeroStats />

          {/* Value Proposition Cards */}
          <ValuePropCards />

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAnyWalletConnected ? (
              <>
                <Button
                  onClick={() => router.push("/dashboard")}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  onClick={() => router.push("/splits")}
                  size="lg"
                  variant="outline"
                  className="font-semibold px-8 py-6 rounded-full"
                >
                  Open Splits <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </>
            ) : (
              <Button
                onClick={showWalletSelectionModal}
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                Connect Wallet <Wallet className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Repository input */}
          <div className="mt-10 max-w-xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Enter your GitHub repository URL"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
                className="bg-white/80 backdrop-blur-sm"
              />
              <Button type="submit" className="whitespace-nowrap bg-blue-600 hover:bg-blue-700">
                Generate Attribution
              </Button>
            </form>
            <div className="flex justify-center gap-6 mt-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Code className="w-4 h-4 text-blue-500" /> Easy Embed
              </span>
              <span className="flex items-center gap-1.5">
                <Github className="w-4 h-4 text-blue-500" /> Live GitHub data
              </span>
              <span className="flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-blue-500" /> Customizable
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
              Connect a wallet, analyze a repo, and distribute payouts in
              minutes.
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

        {/* CTA Section */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to start?
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Try the agent with natural language commands or manage everything from the dashboard.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button
                onClick={handleTryAgent}
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-8 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
              >
                Try Agent <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={handleDashboardNavigation}
                size="lg"
                variant="outline"
                disabled={isDashboardLoading}
                className="font-semibold py-3 px-8"
              >
                {isDashboardLoading ? "Loading..." : "Open Dashboard"}
              </Button>
            </div>
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
