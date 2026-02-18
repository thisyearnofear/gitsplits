"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, action?: Toast["action"]) => string;
  error: (message: string, title?: string, action?: Toast["action"]) => string;
  warning: (message: string, title?: string, action?: Toast["action"]) => string;
  info: (message: string, title?: string, action?: Toast["action"]) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast = { ...toast, id };
      
      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after duration
      if (toast.duration !== 0) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration || 5000);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string, action?: Toast["action"]) => {
      return addToast({ type: "success", message, title, action });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string, action?: Toast["action"]) => {
      return addToast({ type: "error", message, title, action, duration: 8000 });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string, action?: Toast["action"]) => {
      return addToast({ type: "warning", message, title, action });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string, action?: Toast["action"]) => {
      return addToast({ type: "info", message, title, action });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Toast Container Component
function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Individual Toast Item
function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
    error: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
    warning: "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
    info: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  };

  const iconColors = {
    success: "text-green-500",
    error: "text-red-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
  };

  const Icon = icons[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto rounded-lg border shadow-lg p-4 ${colors[toast.type]}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColors[toast.type]}`} />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="font-semibold text-sm">{toast.title}</h4>
          )}
          <p className={`text-sm mt-0.5 ${toast.title ? "opacity-90" : ""}`}>
            {toast.message}
          </p>
          
          {toast.action && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                toast.action?.onClick();
                onRemove(toast.id);
              }}
              className="mt-2 h-8 px-2 text-xs font-medium hover:bg-black/10 dark:hover:bg-white/10"
            >
              {toast.action.label}
            </Button>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Preset toast helpers
export const toastPresets = {
  walletConnected: (address: string) => ({
    type: "success" as const,
    title: "Wallet Connected",
    message: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
  }),
  
  walletDisconnected: () => ({
    type: "info" as const,
    title: "Wallet Disconnected",
    message: "Your wallet has been disconnected.",
  }),
  
  transactionPending: () => ({
    type: "info" as const,
    title: "Transaction Pending",
    message: "Your transaction is being processed...",
    duration: 0, // Don't auto-dismiss
  }),
  
  transactionSuccess: (hash: string) => ({
    type: "success" as const,
    title: "Transaction Successful",
    message: "Your transaction has been confirmed.",
    action: {
      label: "View on Explorer",
      onClick: () => window.open(`https://explorer.near.org/transactions/${hash}`, "_blank"),
    },
  }),
  
  transactionFailed: (error: string) => ({
    type: "error" as const,
    title: "Transaction Failed",
    message: error || "Something went wrong. Please try again.",
  }),
  
  splitCreated: (repo: string) => ({
    type: "success" as const,
    title: "Split Created",
    message: `Successfully created split for ${repo}`,
  }),
  
  verificationComplete: () => ({
    type: "success" as const,
    title: "Verification Complete",
    message: "Your identity has been verified successfully.",
  }),
  
  copiedToClipboard: (item: string) => ({
    type: "success" as const,
    title: "Copied!",
    message: `${item} copied to clipboard.`,
  }),
};

export default ToastProvider;
