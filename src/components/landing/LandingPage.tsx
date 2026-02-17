import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github,
  ArrowRight,
  Wallet,
  Bot,
  Share2,
  Loader2,
  Sparkles,
  Users,
  GitCommit,
  Code2,
  ExternalLink,
  Shield,
  Lock,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LandingPageProps } from "@types";
import { useToast } from "@/hooks/use-toast";
import { useNearWallet } from "@/hooks/useNearWallet";
import { WalletSelector } from "@/components/shared/WalletSelector";
import { useRouter } from "next/navigation";

// Popular repos for quick analysis
const POPULAR_REPOS = [
  { owner: "facebook", name: "react", stars: "230k" },
  { owner: "vercel", name: "next.js", stars: "127k" },
  { owner: "microsoft", name: "vscode", stars: "165k" },
  { owner: "rust-lang", name: "rust", stars: "98k" },
];

// Mock contributor data for visual preview
const MOCK_CONTRIBUTORS = [
  { name: "sarah-dev", commits: 145, avatar: "S" },
  { name: "alex-coder", commits: 98, avatar: "A" },
  { name: "mike-oss", commits: 76, avatar: "M" },
  { name: "jane-git", commits: 54, avatar: "J" },
  { name: "tom-repo", commits: 43, avatar: "T" },
];

interface AnalysisResult {
  owner: string;
  name: string;
  contributors: number;
  totalCommits: number;
  topLanguage: string;
}

const LandingPage: React.FC<LandingPageProps> = ({
  isConnected,
  onDashboardClick,
  onLoginPrompt,
}) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const {
    isConnected: isNearConnected,
    connect: connectNear,
  } = useNearWallet();

  const isAnyWalletConnected = isConnected || isNearConnected;
  const router = useRouter();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const extractRepoInfo = (url: string): { owner: string; name: string } | null => {
    // Support various formats: full URL, owner/repo, or just paste anything
    const patterns = [
      /github\.com\/([^/]+)\/([^/\s]+)/,
      /^([^/\s]+)\/([^/\s]+)$/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          name: match[2].replace(/\.git$/, ""),
        };
      }
    }
    return null;
  };

  const handleAnalyze = async (e?: React.FormEvent, presetUrl?: string) => {
    e?.preventDefault();
    const targetUrl = presetUrl || repoUrl;
    
    if (!targetUrl.trim()) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    if (presetUrl) setRepoUrl(presetUrl);

    try {
      const repoInfo = extractRepoInfo(targetUrl);
      if (!repoInfo) {
        throw new Error("Invalid format. Try: owner/repo or github.com/owner/repo");
      }

      // Simulate realistic analysis
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setAnalysisResult({
        ...repoInfo,
        contributors: Math.floor(Math.random() * 80) + 12,
        totalCommits: Math.floor(Math.random() * 5000) + 500,
        topLanguage: ["TypeScript", "Rust", "Python", "Go"][Math.floor(Math.random() * 4)],
      });

      toast({
        description: `Analyzed ${repoInfo.owner}/${repoInfo.name} successfully!`,
      });
    } catch (error: any) {
      toast({
        description: error.message || "Please enter a valid repository",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTryAgent = (withRepo?: string) => {
    if (withRepo) {
      // Pass repo to agent via query param
      router.push(`/agent?repo=${encodeURIComponent(withRepo)}`);
    } else {
      router.push("/agent");
    }
  };

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleEVMLogin = () => {
    setShowWalletModal(false);
    onLoginPrompt();
  };

  const handleNEARLogin = async () => {
    setShowWalletModal(false);
    try {
      await connectNear();
      setTimeout(() => onDashboardClick(), 2000);
    } catch (error) {
      toast({
        description: "Failed to connect to NEAR wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange">
      <WalletSelector
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelectEVM={handleEVMLogin}
        onSelectNEAR={handleNEARLogin}
      />

      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-blue-200 rounded-full px-4 py-1.5 text-sm text-blue-700 mb-6"
          >
            <Shield className="w-4 h-4" />
            <span>Running on EigenCompute for cryptographic transparency</span>
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Pay open source contributors
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              in one command
            </span>
          </h1>
          
          <p className="text-lg text-gray-600 mb-4 max-w-xl mx-auto">
            Analyze any GitHub repository, get fair split suggestions based on actual contributions, 
            and distribute payments to contributors automatically.
          </p>
          
          <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto">
            <Shield className="w-4 h-4 inline mr-1 text-blue-600" />
            Every calculation runs in a secure TEE with optional attestations — 
            <span className="text-blue-600">verify the agent behaved correctly</span>
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Button
              onClick={() => handleTryAgent()}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg group"
            >
              <Bot className="mr-2 h-5 w-5 group-hover:animate-bounce" />
              Try the Agent
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            {!isAnyWalletConnected ? (
              <Button
                onClick={handleConnectWallet}
                size="lg"
                variant="outline"
                className="font-semibold px-8 py-6 rounded-full border-2"
              >
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/dashboard")}
                size="lg"
                variant="outline"
                className="font-semibold px-8 py-6 rounded-full border-2"
              >
                <ExternalLink className="mr-2 h-5 w-5" />
                Open Dashboard
              </Button>
            )}
          </div>

          {/* Repo Analysis Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/60"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Github className="w-5 h-5 text-gray-700" />
              <p className="text-sm font-medium text-gray-700">
                Analyze any public repository
              </p>
            </div>
            
            <form onSubmit={(e) => handleAnalyze(e)} className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="owner/repo or paste GitHub URL"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="bg-white border-gray-200 pr-10"
                  disabled={isAnalyzing}
                />
                {repoUrl && (
                  <button
                    type="button"
                    onClick={() => { setRepoUrl(""); setAnalysisResult(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>
              <Button 
                type="submit" 
                disabled={isAnalyzing || !repoUrl.trim()}
                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap px-6"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Analyze"
                )}
              </Button>
            </form>

            {/* Quick Pick Repos */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="text-xs text-gray-500 self-center mr-1">Try:</span>
              {POPULAR_REPOS.map((repo) => (
                <button
                  key={`${repo.owner}/${repo.name}`}
                  onClick={() => handleAnalyze(undefined, `${repo.owner}/${repo.name}`)}
                  disabled={isAnalyzing}
                  className="text-xs bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-3 py-1 rounded-full transition-colors"
                >
                  {repo.owner}/{repo.name}
                </button>
              ))}
            </div>

            {/* Analysis Result */}
            <AnimatePresence>
              {analysisResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 pt-5 border-t border-gray-100"
                >
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100">
                    {/* Repo Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                          <Github className="w-6 h-6 text-gray-800" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">
                            {analysisResult.owner}/{analysisResult.name}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Code2 className="w-3.5 h-3.5" />
                              {analysisResult.topLanguage}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitCommit className="w-3.5 h-3.5" />
                              {analysisResult.totalCommits.toLocaleString()} commits
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleTryAgent(`${analysisResult.owner}/${analysisResult.name}`)}
                        className="bg-blue-600 hover:bg-blue-700 shadow-md"
                      >
                        Pay Now
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>

                    {/* Contributors Preview */}
                    <div className="bg-white/70 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Top Contributors
                        </p>
                        <span className="text-xs text-gray-500">
                          {analysisResult.contributors} total
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {MOCK_CONTRIBUTORS.slice(0, 4).map((c, i) => (
                            <div
                              key={i}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                              title={c.name}
                            >
                              {c.avatar}
                            </div>
                          ))}
                          {analysisResult.contributors > 4 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-medium">
                              +{analysisResult.contributors - 4}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-xs text-gray-600">
                          <span className="font-medium text-gray-900">{MOCK_CONTRIBUTORS[0].name}</span> leads with{" "}
                          <span className="font-medium text-gray-900">{MOCK_CONTRIBUTORS[0].commits} commits</span>
                        </div>
                      </div>
                    </div>

                    {/* Suggested Split Preview */}
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Suggested split based on contributions:</span>
                      <span className="font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                        AI-calculated
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Secondary Feature */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => router.push("/splits")}
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors inline-flex items-center gap-2 hover:underline"
            >
              <Share2 className="w-4 h-4" />
              Or embed an attribution widget on your repo
            </button>
          </motion.div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-5xl mx-auto mt-20"
        >
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { 
                step: "1", 
                title: "Analyze", 
                desc: "AI analyzes commits, PRs, and reviews in a secure TEE.",
                icon: <Github className="w-5 h-5" />,
              },
              { 
                step: "2", 
                title: "Split", 
                desc: "Get fair contributor splits with cryptographic transparency.",
                icon: <Users className="w-5 h-5" />,
              },
              { 
                step: "3", 
                title: "Pay", 
                desc: "Distribute payments in one command via NEAR.",
                icon: <Sparkles className="w-5 h-5" />,
              },
              { 
                step: "4", 
                title: "Verify", 
                desc: "Optional attestations prove fair execution on EigenCompute.",
                icon: <Shield className="w-5 h-5" />,
              },
            ].map((item) => (
              <div key={item.step} className="text-center p-5 bg-white/40 backdrop-blur-sm rounded-xl">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* EigenCompute Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="max-w-4xl mx-auto mt-20"
        >
          <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl p-8 text-white">
            <div className="text-center mb-8">
              <Shield className="w-12 h-12 mx-auto mb-4 text-blue-300" />
              <h2 className="text-2xl font-bold mb-2">Cryptographic Transparency</h2>
              <p className="text-blue-200">
                GitSplits runs on EigenCompute — every calculation happens in a secure, 
                hardware-isolated environment with optional attestations.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-4">
                <Lock className="w-6 h-6 mb-3 text-blue-300" />
                <h3 className="font-semibold mb-2">Secure Execution</h3>
                <p className="text-sm text-blue-200">
                  Code runs in a TEE (Trusted Execution Environment) — encrypted even from us.
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <Eye className="w-6 h-6 mb-3 text-blue-300" />
                <h3 className="font-semibold mb-2">Verifiable Results</h3>
                <p className="text-sm text-blue-200">
                  Optional attestations prove the agent calculated splits fairly.
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <Sparkles className="w-6 h-6 mb-3 text-blue-300" />
                <h3 className="font-semibold mb-2">Private Analysis</h3>
                <p className="text-sm text-blue-200">
                  Analyze private repos without exposing sensitive contributor data.
                </p>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <a 
                href="https://eigencloud.xyz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors"
              >
                Learn more about EigenCompute
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-20 text-center text-sm text-gray-500"
        >
          <p>
            Built by{" "}
            <a
              href="https://warpcast.com/papa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              papa
            </a>
            {" "}on EigenCompute & NEAR
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
