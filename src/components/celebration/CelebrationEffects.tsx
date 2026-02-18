"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Trophy, Star, Sparkles, PartyPopper } from "lucide-react";

// Success badge component
export function SuccessBadge({
  message,
  submessage,
  onComplete,
}: {
  message: string;
  submessage?: string;
  onComplete?: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: -50 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 text-center border border-green-200 dark:border-green-800">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
            className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-bold text-gray-900 dark:text-white mb-2"
          >
            {message}
          </motion.h3>
          {submessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-600 dark:text-gray-400"
            >
              {submessage}
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Trophy celebration component
export function TrophyCelebration({
  title,
  onComplete,
}: {
  title: string;
  onComplete?: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0.5, rotate: 10 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl shadow-2xl p-8 text-center"
        >
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 10, 0],
              scale: [1, 1.1, 1, 1.1, 1]
            }}
            transition={{ duration: 1, delay: 0.3 }}
            className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <Trophy className="w-12 h-12 text-yellow-500" />
          </motion.div>
          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
          <p className="text-white/90">Amazing achievement!</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// CSS-based confetti particles
function ConfettiParticle({ delay, color, x }: { delay: number; color: string; x: number }) {
  return (
    <motion.div
      initial={{ 
        opacity: 1, 
        y: -20, 
        x: x,
        rotate: 0,
        scale: 1
      }}
      animate={{ 
        opacity: [1, 1, 0],
        y: [0, 300, 600],
        x: [x, x + (Math.random() - 0.5) * 200, x + (Math.random() - 0.5) * 100],
        rotate: [0, 360, 720],
        scale: [1, 1, 0.5]
      }}
      transition={{ 
        duration: 2.5,
        delay: delay,
        ease: "easeOut"
      }}
      className="absolute w-3 h-3 rounded-sm"
      style={{ backgroundColor: color }}
    />
  );
}

// Confetti explosion effect
export function ConfettiExplosion({ 
  trigger, 
  onComplete 
}: { 
  trigger: boolean; 
  onComplete?: () => void;
}) {
  const colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
  
  useEffect(() => {
    if (trigger) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!trigger) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden flex justify-center">
      {Array.from({ length: 50 }).map((_, i) => (
        <ConfettiParticle
          key={i}
          delay={i * 0.02}
          color={colors[i % colors.length]}
          x={(i - 25) * 20}
        />
      ))}
    </div>
  );
}

// Stars celebration
export function StarsCelebration({ count = 5, trigger }: { count?: number; trigger: boolean }) {
  if (!trigger) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0, 
            scale: 0,
            x: typeof window !== "undefined" ? Math.random() * window.innerWidth : 0,
            y: typeof window !== "undefined" ? window.innerHeight : 0
          }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0.5],
            y: -100
          }}
          transition={{ 
            duration: 2,
            delay: i * 0.2,
            ease: "easeOut"
          }}
          className="absolute"
        >
          <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
        </motion.div>
      ))}
    </div>
  );
}

// Sparkle button effect
export function SparkleButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newSparkle = { id: Date.now(), x, y };
    setSparkles((prev) => [...prev, newSparkle]);
    
    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => s.id !== newSparkle.id));
    }, 1000);
    
    onClick?.();
  };

  return (
    <button onClick={handleClick} className={`relative ${className}`}>
      {children}
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          initial={{ opacity: 1, scale: 0, x: sparkle.x, y: sparkle.y }}
          animate={{ 
            opacity: 0, 
            scale: 1.5,
            x: sparkle.x + (Math.random() - 0.5) * 50,
            y: sparkle.y + (Math.random() - 0.5) * 50
          }}
          transition={{ duration: 0.6 }}
          className="absolute pointer-events-none"
        >
          <Sparkles className="w-4 h-4 text-yellow-400" />
        </motion.div>
      ))}
    </button>
  );
}

// Achievement unlock component
export function AchievementUnlock({
  title,
  description,
  icon: Icon,
  trigger,
  onComplete,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  trigger: boolean;
  onComplete?: () => void;
}) {
  useEffect(() => {
    if (trigger) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!trigger) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-4 right-4 z-50 max-w-sm"
      >
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-2xl p-4 text-white flex items-center gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <Icon className="w-6 h-6" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 uppercase tracking-wide">Achievement Unlocked</p>
            <h4 className="font-bold truncate">{title}</h4>
            <p className="text-sm text-white/80 truncate">{description}</p>
          </div>
          <PartyPopper className="w-6 h-6 text-yellow-300" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for celebrations
export function useCelebration() {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showTrophy, setShowTrophy] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [showBadge, setShowBadge] = useState(false);

  const celebrate = useCallback((type: "confetti" | "trophy" | "stars" | "badge" = "confetti") => {
    switch (type) {
      case "confetti":
        setShowConfetti(true);
        break;
      case "trophy":
        setShowTrophy(true);
        break;
      case "stars":
        setShowStars(true);
        break;
      case "badge":
        setShowBadge(true);
        break;
    }
  }, []);

  const reset = useCallback(() => {
    setShowConfetti(false);
    setShowTrophy(false);
    setShowStars(false);
    setShowBadge(false);
  }, []);

  return {
    celebrate,
    reset,
    showConfetti,
    showTrophy,
    showStars,
    showBadge,
    setShowConfetti,
    setShowTrophy,
    setShowStars,
    setShowBadge,
  };
}

export default {
  SuccessBadge,
  TrophyCelebration,
  ConfettiExplosion,
  StarsCelebration,
  SparkleButton,
  AchievementUnlock,
  useCelebration,
};
