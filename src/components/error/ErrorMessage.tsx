"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type ErrorSeverity = "error" | "warning" | "info";

export interface ErrorMessageProps {
  title?: string;
  message: string;
  severity?: ErrorSeverity;
  onRetry?: () => void;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function ErrorMessage({
  title,
  message,
  severity = "error",
  onRetry,
  onDismiss,
  action,
  className = "",
}: ErrorMessageProps) {
  const severityConfig = {
    error: {
      icon: AlertCircle,
      alertVariant: "destructive" as const,
      title: title || "Error",
    },
    warning: {
      icon: AlertCircle,
      alertVariant: "default" as const,
      title: title || "Warning",
    },
    info: {
      icon: AlertCircle,
      alertVariant: "default" as const,
      title: title || "Info",
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        <Alert variant={config.alertVariant} className="relative">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          <Icon className="h-4 w-4" />
          <AlertTitle className={onDismiss ? "pr-6" : ""}>{config.title}</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">{message}</p>
            
            <div className="flex flex-wrap gap-2">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="h-8"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Try Again
                </Button>
              )}
              
              {action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={action.onClick}
                  className="h-8"
                >
                  {action.label}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}

// Common error messages
export function NetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorMessage
      title="Network Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}

export function WalletConnectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorMessage
      title="Wallet Connection Failed"
      message="Unable to connect to your wallet. Please make sure your wallet is unlocked and try again."
      onRetry={onRetry}
    />
  );
}

export function TransactionError({ 
  message, 
  onRetry 
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <ErrorMessage
      title="Transaction Failed"
      message={message || "The transaction could not be completed. Please check your balance and try again."}
      onRetry={onRetry}
    />
  );
}

export function NotFoundError({ 
  resource = "Resource",
  onBack 
}: { 
  resource?: string;
  onBack: () => void;
}) {
  return (
    <ErrorMessage
      severity="info"
      title={`${resource} Not Found`}
      message={`The ${resource.toLowerCase()} you're looking for doesn't exist or has been removed.`}
      action={{
        label: "Go Back",
        onClick: onBack,
      }}
    />
  );
}

export function UnauthorizedError({ onLogin }: { onLogin: () => void }) {
  return (
    <ErrorMessage
      severity="warning"
      title="Authentication Required"
      message="You need to be logged in to access this feature."
      action={{
        label: "Log In",
        onClick: onLogin,
      }}
    />
  );
}

export default ErrorMessage;
