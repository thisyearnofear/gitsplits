"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
    
    // Could send to error tracking service here
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange dark:from-gentle-blue-dark dark:via-gentle-purple-dark dark:to-gentle-orange-dark">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg"
          >
            <Card className="border-0 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
              <CardHeader className="text-center pb-2">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-2xl text-gray-900 dark:text-white">
                  Something went wrong
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-center text-gray-600 dark:text-gray-400">
                  We apologize for the inconvenience. An unexpected error has occurred.
                </p>

                {/* Error Details (collapsible in production) */}
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-auto max-h-48">
                    <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
                      <Bug className="w-4 h-4" />
                      <span className="text-sm font-medium">Error Details (Development Only)</span>
                    </div>
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {this.state.error.toString()}
                      {"\n\n"}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    onClick={this.handleReload}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Page
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={this.handleGoHome}
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>

                <p className="text-center text-xs text-gray-500 dark:text-gray-500">
                  If this problem persists, please contact support or try again later.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: Record<string, unknown>) => {
    console.error("Handled error:", error, context);
    // Could send to error tracking service
    // Example: Sentry.captureException(error, { extra: context });
  }, []);

  return handleError;
}

export default ErrorBoundary;
