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
} from "lucide-react";
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
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-white text-3xl font-bold">G</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            GitSplits uses AI to analyze GitHub contributions and distribute payments fairly. 
            Let&apos;s show you how it works in 3 simple steps.
          </p>
        </div>
      ),
    },
    {
      id: "analyze",
      title: "1. Analyze Repository",
      description: "Our AI examines commits, PRs, and reviews",
      icon: Github,
      content: (
        <div className="space-y-4">
          <Card className="border-0 shadow-soft bg-gray-50 dark:bg-gray-800/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Github className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Analyzing 1,247 commits</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Processing 89 pull requests</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Reviewing 156 code reviews</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Our secure AI agent runs in a Trusted Execution Environment (TEE) to ensure fair analysis.
          </p>
        </div>
      ),
    },
    {
      id: "verify",
      title: "2. Verify Contributors",
      description: "Contributors link their wallets to receive payments",
      icon: Wallet,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {["S", "A", "M", "J"].map((letter, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-sm font-bold"
                >
                  {letter}
                </div>
              ))}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">12 contributors found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Waiting for wallet verification</p>
            </div>
          </div>
          <Card className="border-0 shadow-soft bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Verification Complete</p>
                  <p className="text-sm text-green-700 dark:text-green-300">8 of 12 contributors verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Contributors verify their identity by linking their GitHub and wallet addresses.
          </p>
        </div>
      ),
    },
    {
      id: "distribute",
      title: "3. Distribute Payments",
      description: "Send payments to verified contributors",
      icon: Bot,
      content: (
        <div className="space-y-4">
          <Card className="border-0 shadow-soft bg-gray-50 dark:bg-gray-800/50">
            <CardContent className="p-4 space-y-3">
              {[
                { name: "sarah-dev", amount: "450 NEAR", percent: "45%" },
                { name: "alex-coder", amount: "280 NEAR", percent: "28%" },
                { name: "mike-oss", amount: "170 NEAR", percent: "17%" },
                { name: "Others", amount: "100 NEAR", percent: "10%" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {item.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.amount}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({item.percent})</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Payments are distributed automatically based on contribution analysis. Only verified contributors receive funds.
          </p>
        </div>
      ),
    },
    {
      id: "ready",
      title: "You're Ready!",
      description: "Start analyzing repositories and rewarding contributors",
      icon: CheckCircle2,
      content: (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            You now understand the basics. Try analyzing a repository or connect your wallet to get started.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                completeOnboarding();
                router.push("/agent");
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
            >
              Try the Agent
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                completeOnboarding();
                router.push("/dashboard");
              }}
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
            <Card className="w-full max-w-lg border-0 shadow-2xl bg-white dark:bg-gray-900 overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <button
                  onClick={skipOnboarding}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{currentStepData.title}</h2>
                    <p className="text-blue-100 text-sm">{currentStepData.description}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {currentStepData.content}
                  </motion.div>
                </AnimatePresence>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 mt-6">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep
                          ? "w-6 bg-blue-600"
                          : index < currentStep
                          ? "bg-blue-400"
                          : "bg-gray-300 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="ghost"
                    onClick={goToPrevious}
                    disabled={currentStep === 0}
                    className={currentStep === 0 ? "invisible" : ""}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>

                  <div className="flex items-center gap-2">
                    {currentStep < steps.length - 1 && (
                      <Button variant="ghost" onClick={skipOnboarding}>
                        Skip
                      </Button>
                    )}
                    <Button
                      onClick={goToNext}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                      {currentStep < steps.length - 1 && (
                        <ChevronRight className="w-4 h-4 ml-1" />
                      )}
                    </Button>
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
