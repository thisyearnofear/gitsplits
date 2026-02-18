"use client";

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
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LandingPageProps } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useNearWallet } from "@/hooks/useNearWallet";
import { WalletSelector } from "@/components/shared/WalletSelector";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

// Popular repos for quick analysis
const POPULAR_REPOS = [
  { owner: "facebook", name: "react", stars: "230k" },
  { owner: "vercel", name: "next.js", stars: "127k" },
  { owner: "microsoft", name: "vscode", stars: "165k" },
  { owner: "rust-lang", name: "rust", stars: "98k" },
];

// Features list
const FEATURES = [
  {
    icon: Shield,
    title: "Secure Attribution",
    description: "Your contributions are securely verified and recorded on-chain for transparent attribution.",
    color: "blue",
  },
  {
    icon: Zap,
    title: "Fair Compensation",
    description: "Receive your fair share based on quality-weighted contribution analysis.",
    color: "purple",
  },
  {
    icon: Bot,
    title: "AI-Powered",
    description: "Smart analysis of commits, PRs, and reviews to determine fair splits.",
    color: "green",
  },
];

// How it works steps
const STEPS = [
  {
    step: "1",
    title: "Analyze",
    desc: "AI analyzes commits, PRs, and reviews in a secure TEE.",
    icon: Github,
  },
  {
    step: "2",
    title: "Split",
    desc: "Get fair contributor splits with cryptographic transparency.",
    icon: Users,
  },
  {
    step: "3",
    title: "Verify",
    desc: "Contributors verify their wallets to receive payments.",
    icon: Shield,
  },
  {
    step: "4",
    title: "Pay",
    desc: "Distribute payments to verified contributors via NEAR.",
    icon: Sparkles,
  },
];

// Security features
const SECURITY_FEATURES = [
  {
    icon: Lock,
    title: "Secure Execution",
    description: "Code runs in a TEE (Trusted Execution Environment) — encrypted even from us.",
  },
  {
    icon: Eye,
    title: "Verifiable Results",
    description: "Optional attestations prove the agent calculated splits fairly.",
  },
  {
    icon: Sparkles,
    title: "Private Analysis",
    description: "Analyze private repos without exposing sensitive contributor data.",
  },
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

      // Call the real agent API
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `analyze ${repoInfo.owner}/${repoInfo.name}`,
          userId: 'landing_page_user',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to analyze: ${response.status}`);
      }

      if (!data.success || !data.response) {
        throw new Error('No analysis data returned');
      }

      // Parse the agent response to extract repo info
      // The response format is: "📊 Analysis for github.com/owner/repo\n\nTotal commits: X\nContributors: Y..."
      const responseText = data.response as string;
      
      // Extract total commits
      const commitsMatch = responseText.match(/Total commits:\s*(\d+)/);
      const contributorsMatch = responseText.match(/Contributors:\s*(\d+)/);
      
      // For language, we'll need to fetch separately or skip for now
      // The agent response doesn't include language in the text format
      
      setAnalysisResult({
        owner: repoInfo.owner,
        name: repoInfo.name,
        contributors: contributorsMatch ? parseInt(contributorsMatch[1]) : 0,
        totalCommits: commitsMatch ? parseInt(commitsMatch[1]) : 0,
        topLanguage: 'Unknown', // Agent doesn't return language in text response
      });

      toast({
        description: `Analyzed ${repoInfo.owner}/${repoInfo.name} successfully!`,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to analyze repository';
      
      // More helpful error messages
      if (errorMessage.includes('AGENT_BASE_URL')) {
        toast({
          description: 'Agent service is not configured. Please try again later.',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('timed out') || errorMessage.includes('504')) {
        toast({
          description: 'The analysis took too long. Please try again.',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('503')) {
        toast({
          description: 'Agent service is temporarily unavailable. Please try again later.',
          variant: 'destructive',
        });
      } else {
        toast({
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTryAgent = (withRepo?: string) => {
    if (withRepo) {
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
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange dark:from-gentle-blue-dark dark:via-gentle-purple-dark dark:to-gentle-orange-dark transition-colors duration-300">
      <WalletSelector
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelectEVM={handleEVMLogin}
        onSelectNEAR={handleNEARLogin}
      />

      <div className="container mx-auto px-4 pt-8 pb-16">
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
            className="inline-flex items-center gap-2 bg-white/60 dark:bg-white/10 backdrop-blur-sm border border-blue-200 dark:border-blue-800 rounded-full px-4 py-1.5 text-sm text-blue-700 dark:text-blue-300 mb-6"
          >
            <Shield className="w-4 h-4" />
            <span>Running on EigenCompute for cryptographic transparency</span>
          </motion.div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Pay open source contributors
            <span className="block gradient-text mt-2">
              in one command
            </span>
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4 max-w-xl mx-auto">
            Analyze any GitHub repository, get fair split suggestions based on actual contributions, 
            and distribute payments to contributors automatically.
          </p>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-lg mx-auto">
            <Shield className="w-4 h-4 inline mr-1 text-blue-600 dark:text-blue-400" />
            Every calculation runs in a secure TEE with optional attestations — 
            <span className="text-blue-600 dark:text-blue-400">verify the agent behaved correctly</span>
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Button
              onClick={() => handleTryAgent()}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg group pulse-glow"
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
                className="font-semibold px-8 py-6 rounded-full border-2 hover:bg-white/50 dark:hover:bg-white/10"
              >
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/dashboard")}
                size="lg"
                variant="outline"
                className="font-semibold px-8 py-6 rounded-full border-2 hover:bg-white/50 dark:hover:bg-white/10"
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
            className="glass rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Github className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Analyze any public repository
              </p>
            </div>
            
            <form onSubmit={(e) => handleAnalyze(e)} className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="owner/repo or paste GitHub URL"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="bg-white/80 dark:bg-black/30 border-gray-200 dark:border-gray-700 pr-10"
                  disabled={isAnalyzing}
                />
                {repoUrl && (
                  <button
                    type="button"
                    onClick={() => { setRepoUrl(""); setAnalysisResult(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
              <span className="text-xs text-gray-500 dark:text-gray-400 self-center mr-1">Try:</span>
              {POPULAR_REPOS.map((repo) => (
                <button
                  key={`${repo.owner}/${repo.name}`}
                  onClick={() => handleAnalyze(undefined, `${repo.owner}/${repo.name}`)}
                  disabled={isAnalyzing}
                  className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1 rounded-full transition-colors"
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
                  className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-xl p-5 border border-blue-100 dark:border-blue-900">
                    {/* Repo Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex items-center justify-center">
                          <Github className="w-6 h-6 text-gray-800 dark:text-gray-200" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-lg">
                            {analysisResult.owner}/{analysisResult.name}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
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
                        Set Up Payment
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>

                    {/* Contributors Preview */}
                    <div className="bg-white/70 dark:bg-black/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Contributors
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {analysisResult.contributors} total
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>
                            Found <span className="font-semibold text-gray-900 dark:text-white">{analysisResult.contributors}</span> contributors with{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">{analysisResult.totalCommits.toLocaleString()}</span> total commits
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                          💡 Use the Agent to see detailed contributor breakdown and set up payment splits
                        </p>
                      </div>
                    </div>

                    {/* Suggested Split Preview */}
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Suggested split based on contributions:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded-full">
                        AI-calculated
                      </span>
                    </div>

                    {/* Verification Notice */}
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          <p className="font-medium mb-1">Contributors must verify before receiving payments</p>
                          <p className="text-amber-700 dark:text-amber-300">
                            Found {analysisResult.contributors} contributors. Payments only go to verified wallets. 
                            <a 
                              href="https://gitsplits.vercel.app/verify" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:text-amber-900 dark:hover:text-amber-100 ml-1"
                            >
                              Learn about verification →
                            </a>
                          </p>
                        </div>
                      </div>
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
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-2 hover:underline"
            >
              <Share2 className="w-4 h-4" />
              Or embed an attribution widget on your repo
            </button>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-5xl mx-auto mt-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Gitsplits?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Fair compensation for open source contributions, powered by AI and secured by blockchain technology.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              >
                <Card className="h-full card-hover bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-0 shadow-soft">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                      feature.color === "blue" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                      feature.color === "purple" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                      "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    }`}>
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-5xl mx-auto mt-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Get started in minutes with our simple four-step process.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                className="relative"
              >
                <div className="text-center p-5 bg-white/40 dark:bg-white/5 backdrop-blur-sm rounded-xl h-full">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-gray-300 dark:text-gray-700" />
                  </div>
                )}
              </motion.div>
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
          <Card className="border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 rounded-xl p-8 text-white">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-blue-300" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">Cryptographic Transparency</h2>
                  <p className="text-blue-200 max-w-xl mx-auto">
                    GitSplits runs on EigenCompute — every calculation happens in a secure, 
                    hardware-isolated environment with optional attestations.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {SECURITY_FEATURES.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                      className="bg-white/10 rounded-xl p-5 backdrop-blur-sm"
                    >
                      <feature.icon className="w-6 h-6 mb-3 text-blue-300" />
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-blue-200">{feature.description}</p>
                    </motion.div>
                  ))}
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
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="max-w-2xl mx-auto mt-20 text-center"
        >
          <Card className="border-0 shadow-soft-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Ready to reward your contributors?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Join the growing community of open source projects using Gitsplits to fairly compensate their contributors.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => handleTryAgent()}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 rounded-full"
                >
                  <Bot className="mr-2 h-5 w-5" />
                  Get Started
                </Button>
                <Button
                  onClick={() => router.push("/dashboard")}
                  size="lg"
                  variant="outline"
                  className="font-semibold px-8 rounded-full"
                >
                  View Dashboard
                </Button>
              </div>
              
              {/* Trust badges */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Free to start
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    No credit card required
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Open source
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built by{" "}
            <a
              href="https://warpcast.com/papa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              papa
            </a>
            {" "}on EigenCompute & NEAR
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            © {new Date().getFullYear()} Gitsplits. All rights reserved.
          </p>
        </motion.footer>
      </div>
    </div>
  );
};

export default LandingPage;
