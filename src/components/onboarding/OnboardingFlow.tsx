"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Github,
  Wallet,
  Bot,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Shield,
} from "lucide-react";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const ONBOARDING_STORAGE_KEY = "gitsplits-onboarding-completed";

export function OnboardingFlow() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user has seen onboarding
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) {
      setHasSeenOnboarding(false);
      // Small delay to let the page load first
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to GitSplits",
      description: "The easiest way to pay open source contributors",
      icon: Sparkles,
      content: (
        <div className="text-center space-y-6 py-4">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-purple-200 dark:shadow-none"
          >
            <span className="text-white text-4xl font-black italic tracking-tighter">GS</span>
          </motion.div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Fair rewards for every commit.</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-[280px] mx-auto">
              GitSplits uses verifiable AI to analyze GitHub contributions and distribute rewards fairly.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "analyze",
      title: "1. Secure AI Analysis",
      description: "Verifiable contribution breakdown",
      icon: Shield,
      content: (
        <div className="space-y-4">
          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800/50 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">TEE SECURED</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">Analysis in Progress...</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="font-medium">1,247 commits processed</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="font-medium">89 pull requests reviewed</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="font-medium">Proof of Fairness generated</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium px-4">
            Our AI runs in a <span className="text-blue-600 font-bold">TEE (Trusted Execution Environment)</span>, making every split mathematically verifiable.
          </p>
        </div>
      ),
    },
    {
      id: "verify",
      title: "2. Connect Identities",
      description: "Linking GitHub to Wallets",
      icon: Wallet,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex -space-x-3">
              {[
                { l: "S", c: "from-blue-400 to-blue-600" },
                { l: "A", c: "from-purple-400 to-purple-600" },
                { l: "M", c: "from-indigo-400 to-indigo-600" },
                { l: "J", c: "from-fuchsia-400 to-fuchsia-600" }
              ].map((item, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.c} border-4 border-white dark:border-gray-900 flex items-center justify-center text-white text-lg font-black shadow-lg`}
                >
                  {item.l}
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-gray-900 dark:text-white">12 Contributors</p>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Awaiting Verification</p>
            </div>
          </div>
          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-green-500">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-green-900 dark:text-green-100 tracking-tight">Identity Secured</p>
                  <p className="text-xs font-bold text-green-700 dark:text-green-300">8 of 12 wallets verified & linked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium px-4 leading-relaxed">
            Contributors verify their identity once to receive rewards across any project using GitSplits.
          </p>
        </div>
      ),
    },
    {
      id: "distribute",
      title: "3. Automated Payouts",
      description: "One command. Instant rewards.",
      icon: Bot,
      content: (
        <div className="space-y-4">
          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800/50 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Calculated Split</span>
              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 text-[10px] font-black">STABLECOINS</Badge>
            </div>
            <CardContent className="p-4 space-y-4">
              {[
                { name: "sarah-dev", amount: "450 USDC", percent: "45%", w: "w-[45%]" },
                { name: "alex-coder", amount: "280 USDC", percent: "28%", w: "w-[28%]" },
                { name: "mike-oss", amount: "170 USDC", percent: "17%", w: "w-[17%]" },
              ].map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-gray-700 dark:text-gray-300">{item.name}</span>
                    <span className="font-black text-gray-900 dark:text-white">{item.amount}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 ${item.w}`}></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl flex items-start gap-3">
             <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
             <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200 leading-tight">
               Payments are sent directly to contributors&apos; verified wallets via NEAR or EVM chains.
             </p>
          </div>
        </div>
      ),
    },
    {
      id: "ready",
      title: "Launch Sequence Ready",
      description: "Your journey starts here.",
      icon: CheckCircle2,
      content: (
        <div className="text-center space-y-6 py-4">
          <div className="relative inline-block">
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </motion.div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-4 border-white dark:border-gray-900 animate-ping"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">You&apos;re all set!</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium px-4">
              Ready to transform how you reward open source contributors?
            </p>
          </div>
          <div className="flex flex-col gap-3 px-4">
            <Button
              onClick={() => {
                completeOnboarding();
                router.push("/agent");
              }}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black rounded-xl shadow-xl shadow-blue-100"
            >
              TRY THE AGENT NOW
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                completeOnboarding();
                router.push("/dashboard");
              }}
              className="text-gray-500 font-bold uppercase tracking-widest text-[10px]"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      ),
    },
  ];

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsOpen(false);
    setHasSeenOnboarding(true);
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const goToNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const restartOnboarding = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  if (!isOpen) {
    // Return a button to restart onboarding if needed
    if (hasSeenOnboarding) {
      return (
        <button
          onClick={restartOnboarding}
          className="fixed bottom-4 right-4 z-40 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          title="Restart onboarding"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      );
    }
    return null;
  }

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={skipOnboarding}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
        <Card className="border-0 shadow-2xl bg-white dark:bg-gray-900 overflow-hidden relative">
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <CardContent className="p-0">
            {/* Header */}
            <div className="relative p-8 text-center border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={skipOnboarding}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
              
              <motion.div
                key={currentStep}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 dark:shadow-none text-white"
              >
                <Icon className="w-8 h-8" />
              </motion.div>
              
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-1">{currentStepData.title}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{currentStepData.description}</p>
            </div>

            {/* Content area */}
            <div className="p-8 min-h-[300px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStepData.content}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer / Navigation */}
            <div className="p-6 bg-gray-50/50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === currentStep
                          ? "w-8 bg-blue-600"
                          : index < currentStep
                          ? "w-1.5 bg-blue-400"
                          : "w-1.5 bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  {currentStep > 0 && (
                    <Button
                      variant="ghost"
                      onClick={goToPrevious}
                      className="text-gray-500 font-bold text-xs uppercase tracking-widest"
                    >
                      Back
                    </Button>
                  )}
                  
                  <Button
                    onClick={goToNext}
                    className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 font-black px-6 h-12 rounded-xl transition-all active:scale-95"
                  >
                    {currentStep === steps.length - 1 ? "FINISH" : "CONTINUE"}
                    {currentStep < steps.length - 1 && (
                      <ChevronRight className="w-4 h-4 ml-2" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default OnboardingFlow;
