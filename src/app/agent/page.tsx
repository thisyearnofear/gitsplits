'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import Header from '@/components/shared/Header';
import FlowStatusStrip from '@/components/shared/FlowStatusStrip';
import { Search, Plus, DollarSign, Shield, Send, Loader2, Bot, Sparkles, ChevronRight, Github, ExternalLink, CheckCircle2, AlertCircle, RefreshCcw, Wallet, Info, Maximize2, Minimize2 } from 'lucide-react';
import { trackUxEvent } from '@/lib/services/ux-events';

interface Message {
  role: 'user' | 'agent';
  text: string;
  timestamp?: Date;
  isTyping?: boolean;
  type?: 'analysis' | 'split_created' | 'payment_sent' | 'verification' | 'welcome';
  data?: any;
}

function ExecutionPill({ execution }: { execution?: any }) {
  if (!execution || !execution.plane) return null;
  const isEigen = execution.plane === 'eigen';
  const label = isEigen ? 'Verified in TEE (Eigen)' : 'Processed on Hetzner';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        isEigen
          ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300'
          : 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
      }`}
    >
      {label}
    </span>
  );
}

interface CommandExample {
  command: string;
  description: string;
  icon: React.ReactNode;
  category: 'analyze' | 'create' | 'pay' | 'verify';
}

function extractRepoUrlFromText(text: string): string | null {
  const match = text.match(/github\.com\/[a-zA-Z0-9-._/]+/);
  return match?.[0] || null;
}

function extractCoverage(text: string): { verified: number; total: number } | null {
  const match = text.match(/Verification coverage:\s*(\d+)\s*\/\s*(\d+)\s*verified/i);
  if (!match) return null;
  return {
    verified: Number(match[1]),
    total: Number(match[2]),
  };
}

function extractSplitId(text: string): string | null {
  const match = text.match(/\b(split-\d+)\b/i);
  return match?.[1] || null;
}

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex gap-1 items-center px-1">
    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

export default function AgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repoParam = searchParams.get('repo');
  const commandParam = searchParams.get('command');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'agent', 
      type: 'welcome',
      text: 'Hello! I\'m GitSplits Agent. I can help you analyze repositories, create payment splits, and distribute rewards to contributors.',
      timestamp: new Date()
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const flowSteps = useMemo(() => {
    const hasAnalysis = messages.some((m) => m.type === 'analysis');
    const hasVerification = messages.some((m) => String(m.text || '').includes('Verification status'));
    const hasSplit = messages.some((m) => m.type === 'split_created' || String(m.text || '').includes('Split created'));
    const hasPayment = messages.some((m) => m.type === 'payment_sent' || String(m.text || '').includes('Distributed '));
    const hasClaims = messages.some((m) => String(m.text || '').includes('Pending claims'));
    return [
      { id: 'analyze', label: 'Analyze', href: '/agent', complete: hasAnalysis, current: !hasAnalysis },
      { id: 'verify', label: 'Verify', href: '/verify', complete: hasVerification, current: hasAnalysis && !hasVerification },
      { id: 'split', label: 'Create Split', href: '/splits', complete: hasSplit, current: hasVerification && !hasSplit },
      { id: 'pay', label: 'Pay', href: '/splits', complete: hasPayment, current: hasSplit && !hasPayment },
      { id: 'claim', label: 'Claim', href: '/splits', complete: hasClaims, current: hasPayment && !hasClaims },
    ];
  }, [messages]);

  // Auto-scroll chat container only (prevents page jumping to example commands)
  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle repo parameter from landing page
  useEffect(() => {
    if (commandParam && !hasInteracted) {
      setInput(commandParam);
      return;
    }
    if (repoParam && !hasInteracted) {
      const command = `analyze ${repoParam}`;
      setInput(command);
      
      // Auto-send the command after a short delay
      const timer = setTimeout(() => {
        sendMessage(command);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [repoParam, commandParam, hasInteracted]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const original = document.body.style.overflow;
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = original;
    };
  }, [isFullScreen]);

  const commandExamples: CommandExample[] = [
    {
      command: 'analyze thisyearnofear/gitsplits',
      description: 'View top contributors and verification coverage',
      icon: <Search className="w-4 h-4" />,
      category: 'analyze',
    },
    {
      command: 'create split for thisyearnofear/gitsplits',
      description: 'Create a split for GitSplits',
      icon: <Plus className="w-4 h-4" />,
      category: 'create',
    },
    {
      command: 'pay 10 USDC to thisyearnofear/gitsplits',
      description: 'Redirect to Splits for direct wallet payout setup',
      icon: <DollarSign className="w-4 h-4" />,
      category: 'pay',
    },
    {
      command: 'verify contributors for thisyearnofear/gitsplits',
      description: 'See who is verified and invite the rest',
      icon: <Shield className="w-4 h-4" />,
      category: 'verify',
    },
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      analyze: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
      create: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
      pay: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800',
      verify: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    setHasInteracted(true);
    const userMessage = textToSend.trim();
    const cmd = userMessage.toLowerCase();
    if (cmd.startsWith('analyze')) trackUxEvent('funnel_analyze_started');
    if (cmd.startsWith('verify')) trackUxEvent('funnel_verify_started');
    if (cmd.startsWith('create')) trackUxEvent('funnel_split_create_started');
    if (cmd.startsWith('pay')) trackUxEvent('funnel_pay_submitted');
    setLastCommand(userMessage);

    if (cmd.startsWith('pay ')) {
      const parsed = parsePayCommand(userMessage);
      if (parsed?.repo) {
        const repoPath = parsed.repo.replace(/^github\.com\//i, '');
        const amount = parsed.amount ?? 1;
        const token = parsed.token ?? 'NEAR';
        setMessages((prev) => [
          ...prev,
          { role: 'user', text: userMessage, timestamp: new Date() },
          {
            role: 'agent',
            text:
              `🔐 Direct wallet payout required.\n\n` +
              `GitSplits now executes payouts from your connected NEAR wallet (not backend treasury).\n` +
              `Continuing to Splits for wallet signature...`,
            timestamp: new Date(),
            type: 'payment_sent',
          },
        ]);
        router.push(`/splits?repo=${encodeURIComponent(repoPath)}&amount=${amount}&token=${encodeURIComponent(token)}`);
        return;
      }
    }
    
    if (!messageText) {
      setInput('');
    }
    
    setMessages((prev) => [...prev, { 
      role: 'user', 
      text: userMessage, 
      timestamp: new Date() 
    }]);
    
    setLoading(true);
    trackUxEvent('agent_command_start', { command: userMessage.slice(0, 120) });

    // Add typing indicator
    setMessages((prev) => [...prev, { 
      role: 'agent', 
      text: '', 
      timestamp: new Date(),
      isTyping: true 
    }]);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMessage }),
      });

      const data = await res.json();

      // Helper to detect message type from text
      const detectType = (text: string) => {
        if (text.includes('📊 Analysis for')) return 'analysis';
        if (
          text.includes('✅ Split created') ||
          text.includes('Split created') ||
          text.toLowerCase().includes('split already exists') ||
          text.toLowerCase().includes('already exists for github.com/')
        ) return 'split_created';
        if (
          text.includes('💸 Payment sent') ||
          text.includes('Payment successfully sent') ||
          text.includes('✅ Distributed ')
        ) return 'payment_sent';
        if (text.includes('✅ Verification coverage') || text.includes('Verification status')) return 'verification';
        return undefined;
      };

      // Remove typing indicator and add response
      setMessages((prev) => {
        const withoutTyping = prev.filter(m => !m.isTyping);
      if (data.success) {
          trackUxEvent('agent_command_success');
          if (userMessage.toLowerCase().startsWith('create')) trackUxEvent('funnel_split_created');
          if (userMessage.toLowerCase().startsWith('pay')) trackUxEvent('funnel_pay_success');
          const type = detectType(data.response);
          return [...withoutTyping, { 
            role: 'agent', 
            text: data.response, 
            type,
            data: { ...(data.data || {}), execution: data.execution }, // Capture structured metadata
            timestamp: new Date() 
          }];
        } else {
          trackUxEvent('agent_command_failed', { reason: 'upstream_error' });
          return [...withoutTyping, { 
            role: 'agent', 
            text: `❌ ${data.error}`, 
            timestamp: new Date() 
          }];
        }
      });
    } catch (error: any) {
      trackUxEvent('agent_command_failed', { reason: 'network_error' });
      setMessages((prev) => {
        const withoutTyping = prev.filter(m => !m.isTyping);
        const human =
          error?.message?.toLowerCase()?.includes('timed out')
            ? 'The agent took too long to respond. Please retry.'
            : toUserFacingError(error?.message || 'Failed to contact agent');
        return [...withoutTyping, { 
          role: 'agent', 
          text: `❌ Error: ${human}`, 
          timestamp: new Date() 
        }];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleExampleClick = (command: string) => {
    setInput(command);
    inputRef.current?.focus();
  };

  const MessageBubble = ({ msg }: { msg: Message }) => {
    if (msg.isTyping) {
      return (
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 border border-border">
          <TypingIndicator />
        </div>
      );
    }

    if (msg.role === 'user') {
      return (
        <div className="max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md shadow-sm">
          {msg.text}
        </div>
      );
    }

    // Special handling for welcome message
    if (msg.type === 'welcome') {
      return (
        <div className="max-w-[90%] bg-card rounded-2xl rounded-bl-md p-6 border border-border shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl opacity-50"></div>
          
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-foreground tracking-tight">GitSplits Intelligence</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">{msg.text}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 relative z-10">
            <div className="flex items-center gap-3 p-3 bg-muted/80 rounded-xl border border-border transition-colors hover:bg-card hover:shadow-sm">
              <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300 rounded-lg">
                <Search className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-foreground">Analyze repo contributions</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/80 rounded-xl border border-border transition-colors hover:bg-card hover:shadow-sm">
              <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300 rounded-lg">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-foreground">Create payment splits</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/80 rounded-xl border border-border transition-colors hover:bg-card hover:shadow-sm">
              <div className="p-2 bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-300 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-foreground">Send payouts automatically</span>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 relative z-10 shadow-sm">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-full">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
              Important: Contributors must verify their wallets at 
              <a href="https://gitsplits.vercel.app/verify" target="_blank" rel="noopener noreferrer" className="underline font-black ml-1 text-amber-950 dark:text-amber-100">gitsplits.vercel.app/verify</a>
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest justify-center pt-2">
            <div className="h-px w-8 bg-border"></div>
            <span>Ready for your first command</span>
            <div className="h-px w-8 bg-border"></div>
          </div>
        </div>
      );
    }

  // Special handling for analysis response
  if (msg.type === 'analysis') {
    const repoUrl = extractRepoUrlFromText(msg.text);
    const repoName = repoUrl?.replace('github.com/', '');
    const hasCoverage = msg.text.includes('Verification coverage');
    const hasCreateHint = msg.text.includes('Create a split');

    return (
        <div className="max-w-[90%] bg-card rounded-2xl rounded-bl-md border border-border shadow-lg overflow-hidden transition-all hover:shadow-xl">
        <div className="bg-muted/50 px-4 py-3 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-card rounded-md shadow-sm">
              <Github className="w-4 h-4 text-foreground" />
            </div>
            <span className="text-xs font-bold text-foreground uppercase tracking-tight">Repository Insights</span>
          </div>
          {repoUrl && (
            <a 
              href={repoUrl.startsWith('http') ? repoUrl : `https://${repoUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-primary bg-card px-2 py-1 rounded-full border border-border flex items-center gap-1 hover:bg-muted transition-colors"
            >
              SOURCE <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
          <div className="p-4 space-y-5">
          <ExecutionPill execution={msg.data?.execution} />
          <div className="whitespace-pre-wrap text-sm text-foreground font-mono text-[13px] bg-muted/50 p-4 rounded-xl border border-border shadow-inner leading-relaxed">
            {msg.text}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-border"></div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Next Steps</span>
              <div className="h-px flex-1 bg-border"></div>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-2">
              <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">Happy Path</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-card border border-emerald-200 dark:border-emerald-800 px-2.5 py-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                  ✅ 1. Analyze repo
                </div>
                <div className={`rounded-md bg-card border px-2.5 py-2 font-semibold ${hasCoverage ? 'border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'}`}>
                  {hasCoverage ? '✅' : '⏳'} 2. Check verification
                </div>
                <div className={`rounded-md bg-card border px-2.5 py-2 font-semibold ${hasCreateHint ? 'border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'}`}>
                  {hasCreateHint ? '✅' : '⏳'} 3. Create split
                </div>
                <div className="rounded-md bg-card border border-amber-200 dark:border-amber-800 px-2.5 py-2 text-amber-800 dark:text-amber-300 font-semibold">
                  ⏳ 4. Pay contributors
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all cursor-pointer group shadow-sm overflow-hidden" onClick={() => sendMessage(`create split for ${repoName || 'this repo'}`)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300 rounded-lg group-hover:scale-110 transition-transform">
                      <Plus className="w-4 h-4" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-300 dark:text-purple-700 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Reward Everyone</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Automated distribution based on contributions</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs font-bold rounded-lg shadow-md shadow-purple-500/20"
                  >
                    Create Split
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer group shadow-sm overflow-hidden" onClick={() => sendMessage(`verify contributors for ${repoName || 'this repo'}`)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300 rounded-lg group-hover:scale-110 transition-transform">
                      <Shield className="w-4 h-4" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-300 dark:text-blue-700 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Review Status</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Check which contributors are verified</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-card h-8 text-xs font-bold rounded-lg"
                  >
                    Check Verification
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all cursor-pointer group shadow-sm overflow-hidden"
                onClick={() => router.push(`/splits?repo=${encodeURIComponent(repoName || '')}`)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg group-hover:scale-110 transition-transform">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-300 dark:text-emerald-700 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Open Funding Workspace</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">View split details, funding progress, and pay from your wallet</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-card h-8 text-xs font-bold rounded-lg"
                  >
                    Open Workspace
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="bg-amber-50/80 dark:bg-amber-950/20 backdrop-blur-sm rounded-xl p-3 flex items-start gap-3 border border-amber-200 dark:border-amber-800 shadow-sm">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-full">
              <Info className="w-3 h-3 text-amber-700 dark:text-amber-400" />
            </div>
            <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
              You can customize the split percentages manually before finalizing the rewards.
            </p>
          </div>
        </div>
      </div>
    );
  }

    // Special handling for split created response
    if (msg.type === 'split_created') {
      const deTerminalLink = msg.text.match(/https:\/\/determinal\.eigenarcade\.com\/verify\/[a-zA-Z0-9]+/)?.[0];
      const repoUrl = extractRepoUrlFromText(msg.text);
      const repoName = repoUrl?.replace('github.com/', '');
      const repoCommandTarget = repoName ? `github.com/${repoName}` : 'this repo';
      const coverage = extractCoverage(msg.text);
      const splitId = extractSplitId(msg.text);
      const splitExists = msg.text.toLowerCase().includes('already exists');
      const hasCoverageGap = !!coverage && coverage.total > 0 && coverage.verified < coverage.total;
      
      return (
        <div className="max-w-[90%] bg-card rounded-2xl rounded-bl-md border border-purple-200 dark:border-purple-800 shadow-lg overflow-hidden transition-all hover:shadow-xl">
          <div className="bg-purple-50/50 dark:bg-purple-950/20 px-4 py-3 border-b border-purple-200 dark:border-purple-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-card rounded-md shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              </div>
              <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-tight">Distribution Ready</span>
            </div>
          </div>
          <div className="p-4 space-y-5">
            <ExecutionPill execution={msg.data?.execution} />
            <div className="whitespace-pre-wrap text-sm text-foreground bg-muted/50 p-4 rounded-xl border border-border italic shadow-inner leading-relaxed">
              {msg.text.split('🔗')[0]}
            </div>

            {splitExists && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
                <p className="text-[11px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wide">Manage Existing Distribution</p>
                <p className="text-xs text-blue-900 dark:text-blue-200">
                  This repo already has an active distribution{splitId ? ` (${splitId})` : ''}. Continue from here:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => router.push(`/splits?repo=${encodeURIComponent(repoName || '')}`)}
                  >
                    Open Distribution Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs font-bold"
                    onClick={() => router.push(`/splits?repo=${encodeURIComponent(repoName || '')}&amount=10&token=NEAR`)}
                  >
                    Contribute Funds
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs font-bold"
                    onClick={() => sendMessage(`pending ${repoCommandTarget}`)}
                  >
                    View Payment History
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs font-bold"
                    onClick={() => sendMessage(`verify contributors for ${repoCommandTarget}`)}
                  >
                    Check Recipient Verification
                  </Button>
                </div>
              </div>
            )}

            {deTerminalLink && (
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield className="w-12 h-12" />
                </div>
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 relative z-10">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded-md">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em]">Proof of Fairness</span>
                </div>
                <p className="text-xs text-blue-700/80 dark:text-blue-400/80 leading-relaxed font-medium relative z-10">
                  This split was computed within a <strong>Trusted Execution Environment (TEE)</strong>. The distribution is mathematically verifiable against GitHub commit logs.
                </p>
                <Button 
                  asChild
                  size="sm" 
                  variant="outline" 
                  className="w-full bg-card/80 backdrop-blur-sm border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-card h-9 text-xs font-bold rounded-lg relative z-10 shadow-sm"
                >
                  <a href={deTerminalLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                    Verify on deTERMinal
                  </a>
                </Button>
              </div>
            )}
            
            <div className="pt-2 border-t border-border space-y-4">
              {hasCoverageGap ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200 font-medium">
                    Payout is paused until all payout-eligible contributors are verified.
                  </div>
                  <Button
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-sm font-black rounded-xl"
                    onClick={() => sendMessage(`verify contributors for ${repoName || 'this repo'}`)}
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Invite Unverified Contributors
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-1 mb-1">
                      <div className="h-px flex-1 bg-border"></div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Action Required</span>
                      <div className="h-px flex-1 bg-border"></div>
                    </div>
                    <Button 
                      size="lg" 
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12 text-sm font-black rounded-xl shadow-xl shadow-green-500/20 border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                      onClick={() => router.push(`/splits?repo=${encodeURIComponent(repoName || '')}&amount=10&token=NEAR`)}
                    >
                      <DollarSign className="w-5 h-5 mr-2" />
                      PAY FROM MY WALLET
                    </Button>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 h-9 text-xs font-bold border-border hover:bg-muted rounded-lg"
                      onClick={() => sendMessage(`show distribution for ${repoName || 'this repo'}`)}
                    >
                      <Search className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      View Shares
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 h-9 text-xs font-bold border-border hover:bg-muted rounded-lg"
                      onClick={() => sendMessage(`regenerate split for ${repoName || 'this repo'}`)}
                    >
                      <RefreshCcw className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      Recalculate
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === 'payment_sent') {
      const repoUrl = extractRepoUrlFromText(msg.text);
      const repoName = repoUrl?.replace('github.com/', '') || 'this repo';
      const txRaw = msg.text.match(/(?:Transaction|🔗 Transaction):\s*([^\n]+)/i)?.[1]?.trim() || '';
      const teeRaw = msg.text.match(/(?:TEE Signature|Signed by TEE):\s*([^\n]+)/i)?.[1]?.trim() || '';
      const distributed = msg.text.match(/Distributed\s+([0-9.]+\s+[A-Z0-9]+)/i)?.[1] || null;
      const coverage = msg.text.match(/Coverage:\s*(\d+)\s*\/\s*(\d+)/i);
      const pendingClaims = msg.text.match(/Pending claims .*?\((\d+)\)/i);
      const verifiedCount = coverage ? Number(coverage[1]) : null;
      const totalCount = coverage ? Number(coverage[2]) : null;
      const unverifiedCount =
        verifiedCount !== null && totalCount !== null
          ? Math.max(totalCount - verifiedCount, 0)
          : null;
      const pendingCount = pendingClaims ? Number(pendingClaims[1]) : 0;
      const txHash = normalizeTxHash(txRaw);
      const txLink = txHash ? `https://etherscan.io/tx/${txHash}` : null;
      const txSepoliaLink = txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : null;
      const nearTxLink = txRaw && !txHash ? `https://nearblocks.io/txns/${txRaw}` : null;
      const teeAddress = normalizeAddress(teeRaw);
      const teeLink = teeAddress ? `https://etherscan.io/address/${teeAddress}` : null;
      const isDirectWalletMode = msg.text.includes('direct_wallet_near') || msg.text.includes('Direct wallet payout required');

      return (
        <div className="max-w-[90%] bg-card rounded-2xl rounded-bl-md border border-green-200 dark:border-green-800 shadow-lg overflow-hidden">
          <div className="bg-green-50/50 dark:bg-green-950/20 px-4 py-3 border-b border-green-200 dark:border-green-800 flex items-center gap-2">
            <div className="p-1.5 bg-card rounded-md shadow-sm">
              <DollarSign className="w-4 h-4 text-green-700 dark:text-green-400" />
            </div>
            <span className="text-xs font-bold text-green-800 dark:text-green-400 uppercase tracking-tight">Distribution Completed</span>
          </div>
          <div className="p-4 space-y-3">
            <ExecutionPill execution={msg.data?.execution} />
            <p className="text-xs text-green-900 dark:text-green-300 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-2 font-medium">
              {isDirectWalletMode
                ? 'Payment mode: direct NEAR wallet signing.'
                : 'Distribution request executed through the configured payout rails.'}
            </p>
            {!isDirectWalletMode && (
              <p className="text-xs text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-2 font-medium">
                Funding source: configured payout rails (HOT/Ping). It does not currently debit your connected browser wallet directly.
              </p>
            )}
            <div className="rounded-md border border-border bg-card p-3 text-xs text-foreground space-y-1">
              <p><strong>Amount distributed:</strong> {distributed || 'n/a'}</p>
              <p><strong>Coverage:</strong> {verifiedCount !== null && totalCount !== null ? `${verifiedCount}/${totalCount} recipients verified` : 'n/a'}</p>
              <p><strong>Recipients pending verification:</strong> {unverifiedCount !== null ? unverifiedCount : 'n/a'}</p>
              <p><strong>Pending claims created:</strong> {pendingCount}</p>
              {pendingCount > 0 && (
                <p className="text-amber-700 dark:text-amber-400">
                  Unverified contributors are not paid now; their portion is held as pending claims until they verify.
                </p>
              )}
            </div>
            <div className="whitespace-pre-wrap text-sm text-foreground bg-muted/50 p-3 rounded-lg border border-border">
              {msg.text}
            </div>
            <div className="flex flex-wrap gap-2">
              {txLink && (
                <a href={txLink} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <ExternalLink className="w-3 h-3 mr-1.5" />
                    View Tx (Mainnet)
                  </Button>
                </a>
              )}
              {nearTxLink && (
                <a href={nearTxLink} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <ExternalLink className="w-3 h-3 mr-1.5" />
                    View Tx (NEAR)
                  </Button>
                </a>
              )}
              {txSepoliaLink && (
                <a href={txSepoliaLink} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <ExternalLink className="w-3 h-3 mr-1.5" />
                    View Tx (Sepolia)
                  </Button>
                </a>
              )}
              {teeLink && (
                <a href={teeLink} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <Shield className="w-3 h-3 mr-1.5" />
                    View TEE Signer
                  </Button>
                </a>
              )}
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => sendMessage(`verify contributors for ${repoName}`)}>
                <Shield className="w-3 h-3 mr-1.5" />
                Review Recipient Verification
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Default agent message
    return (
      <div className="max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap text-sm bg-muted text-foreground rounded-bl-md border border-border shadow-sm">
        {msg.text}
      </div>
    );
  };

  return (
    <>
      <Header />
      <div className="min-h-screen page-gradient pt-20">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 glass border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
              <Bot className="w-8 h-8 text-primary" />
              GitSplits Agent
            </h1>
            <p className="text-muted-foreground">Compensate open source contributors with natural language commands</p>
          </div>

          <div className="mb-4">
            <FlowStatusStrip steps={flowSteps} title="Contributor Payout Journey" />
          </div>
          <div className="mb-4 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Payment engines</p>
            <p>
              <strong>Direct Wallet (NEAR):</strong> user-signed payouts in <code>/splits</code> (default user flow).
            </p>
            <p>
              <strong>Agent Rails (HOT/Ping):</strong> backend-integrated payout rails used by agent pay-intent infrastructure.
            </p>
          </div>

          {/* Chat Container */}
          <Card className={`shadow-xl border-0 overflow-hidden ${isFullScreen ? 'fixed inset-3 z-[70] md:inset-6' : ''}`}>
            <CardContent className="p-0">
              <div className="border-b bg-card px-3 py-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullScreen((prev) => !prev)}
                >
                  {isFullScreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 mr-1.5" />
                      Exit Fullscreen
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
                      Fullscreen
                    </>
                  )}
                </Button>
              </div>
              {/* Messages */}
              <div ref={messagesContainerRef} className={`${isFullScreen ? 'h-[calc(100vh-13.5rem)]' : 'h-96'} overflow-y-auto p-4 space-y-4 bg-card`}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <MessageBubble msg={msg} />
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-border p-4 bg-muted sticky bottom-0 z-10">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command or question..."
                    className="flex-1 bg-card border-border focus:border-primary focus:ring-primary"
                    disabled={loading}
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 transition-all"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send • Commands: analyze, create, pay, verify
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 text-center">
              Current mode: pay commands redirect to Splits for direct NEAR wallet signing.
            </p>
                {lastCommand && !loading && (
                  <div className="mt-2 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(lastCommand)}
                    >
                      Retry Last Command
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Commands */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-foreground mb-4 text-center">Example Commands</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {commandExamples.map((cmd) => (
                <button
                  key={cmd.command}
                  onClick={() => handleExampleClick(cmd.command)}
                  className="flex items-start gap-3 p-3 glass rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all text-left group"
                >
                  <div className={`p-2 rounded-lg ${getCategoryColor(cmd.category)} transition-transform group-hover:scale-110`}>
                    {cmd.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                      {cmd.command}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cmd.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize shrink-0">
                    {cmd.category}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-foreground">
              <strong>💡 Tip:</strong> You can also interact with the agent on X (Twitter) by mentioning @gitsplits or through Farcaster! COMING SOON
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function toUserFacingError(raw: string): string {
  const lower = String(raw || '').toLowerCase();
  if (lower.includes('not installed')) return 'GitHub App is not installed on that repo. Try another repo or update app installation.';
  if (lower.includes('timed out')) return 'The request timed out. Retry in a few seconds.';
  if (lower.includes('fetch') || lower.includes('network')) return 'Network issue while contacting the agent. Please retry.';
  return raw;
}

function normalizeTxHash(value: string): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^0x[a-fA-F0-9]{64}$/.test(raw)) return raw;
  if (/^[a-fA-F0-9]{64}$/.test(raw)) return `0x${raw}`;
  return null;
}

function normalizeAddress(value: string): string | null {
  const raw = String(value || '').trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(raw)) return raw;
  return null;
}

function parsePayCommand(input: string): { amount: number; token: string; repo: string } | null {
  const match = input.match(/pay\s+(\d+(?:\.\d+)?)\s*([a-zA-Z0-9]+)\s+to\s+(.+)/i);
  if (!match) return null;
  return {
    amount: Number(match[1]),
    token: String(match[2] || 'NEAR').toUpperCase(),
    repo: String(match[3] || '').trim(),
  };
}
