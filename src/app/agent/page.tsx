'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import Header from '@/components/shared/Header';
import FlowStatusStrip from '@/components/shared/FlowStatusStrip';
import { Search, Plus, DollarSign, Shield, Send, Loader2, Bot, Sparkles, ChevronRight, Github, ExternalLink, CheckCircle2, AlertCircle, RefreshCcw, Wallet, Info } from 'lucide-react';
import { trackUxEvent } from '@/lib/services/ux-events';

interface Message {
  role: 'user' | 'agent';
  text: string;
  timestamp?: Date;
  isTyping?: boolean;
  type?: 'analysis' | 'split_created' | 'payment_sent' | 'verification' | 'welcome';
  data?: any;
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

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex gap-1 items-center px-1">
    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

export default function AgentPage() {
  const searchParams = useSearchParams();
  const repoParam = searchParams.get('repo');
  const commandParam = searchParams.get('command');
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const commandExamples: CommandExample[] = [
    {
      command: 'analyze near/near-sdk-rs',
      description: 'View top contributors and activity',
      icon: <Search className="w-4 h-4" />,
      category: 'analyze',
    },
    {
      command: 'analyze thisyearnofear/gitsplits',
      description: 'Analyze contributors for GitSplits',
      icon: <Search className="w-4 h-4" />,
      category: 'analyze',
    },
    {
      command: 'analyze openclaw/openclaw',
      description: 'Analyze contributors for OpenClaw',
      icon: <Search className="w-4 h-4" />,
      category: 'analyze',
    },
    {
      command: 'create split for facebook/react',
      description: 'Set up contributor splits',
      icon: <Plus className="w-4 h-4" />,
      category: 'create',
    },
    {
      command: 'create split for thisyearnofear/gitsplits',
      description: 'Create a split for GitSplits',
      icon: <Plus className="w-4 h-4" />,
      category: 'create',
    },
    {
      command: 'create split for openclaw/openclaw',
      description: 'Create a split for OpenClaw',
      icon: <Plus className="w-4 h-4" />,
      category: 'create',
    },
    {
      command: 'pay 100 USDC to near/near-sdk-rs',
      description: 'Distribute payments automatically',
      icon: <DollarSign className="w-4 h-4" />,
      category: 'pay',
    },
    {
      command: 'pay 10 USDC to thisyearnofear/gitsplits',
      description: 'Pay contributors on the GitSplits split',
      icon: <DollarSign className="w-4 h-4" />,
      category: 'pay',
    },
    {
      command: 'pay 10 USDC to openclaw/openclaw',
      description: 'Pay contributors on the OpenClaw split',
      icon: <DollarSign className="w-4 h-4" />,
      category: 'pay',
    },
    {
      command: 'verify my-github-username',
      description: 'Link your GitHub identity',
      icon: <Shield className="w-4 h-4" />,
      category: 'verify',
    },
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      analyze: 'bg-blue-100 text-blue-700 border-blue-200',
      create: 'bg-purple-100 text-purple-700 border-purple-200',
      pay: 'bg-green-100 text-green-700 border-green-200',
      verify: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
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
        if (text.includes('✅ Split created') || text.includes('Split created')) return 'split_created';
        if (text.includes('💸 Payment sent') || text.includes('Payment successfully sent')) return 'payment_sent';
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
            data: data.data, // Capture any structured data if returned
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
        <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200">
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
        <div className="max-w-[90%] bg-white rounded-2xl rounded-bl-md p-6 border border-blue-100 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-50 rounded-full blur-3xl opacity-50"></div>
          
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg shadow-blue-100">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-gray-900 tracking-tight">GitSplits Intelligence</h3>
              <p className="text-sm font-medium text-gray-600 leading-relaxed">{msg.text}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 relative z-10">
            <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100 transition-colors hover:bg-white hover:shadow-sm">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Search className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-700">Analyze repo contributions</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100 transition-colors hover:bg-white hover:shadow-sm">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-700">Create payment splits</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100 transition-colors hover:bg-white hover:shadow-sm">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-700">Send payouts automatically</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3 relative z-10 shadow-sm">
            <div className="p-1.5 bg-amber-100 rounded-full">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Important: Contributors must verify their wallets at 
              <a href="https://gitsplits.vercel.app/verify" target="_blank" rel="noopener noreferrer" className="underline font-black ml-1 text-amber-950">gitsplits.vercel.app/verify</a>
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest justify-center pt-2">
            <div className="h-px w-8 bg-gray-100"></div>
            <span>Ready for your first command</span>
            <div className="h-px w-8 bg-gray-100"></div>
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
      <div className="max-w-[90%] bg-white rounded-2xl rounded-bl-md border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-md shadow-sm">
              <Github className="w-4 h-4 text-gray-700" />
            </div>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">Repository Insights</span>
          </div>
          {repoUrl && (
            <a 
              href={repoUrl.startsWith('http') ? repoUrl : `https://${repoUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-blue-600 bg-white px-2 py-1 rounded-full border border-blue-100 flex items-center gap-1 hover:bg-blue-50 transition-colors"
            >
              SOURCE <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
        <div className="p-4 space-y-5">
          <div className="whitespace-pre-wrap text-sm text-gray-800 font-mono text-[13px] bg-gray-50/50 p-4 rounded-xl border border-gray-100 shadow-inner leading-relaxed">
            {msg.text}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-gray-100"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Next Steps</span>
              <div className="h-px flex-1 bg-gray-100"></div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-2">
              <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">Happy Path</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-white border border-emerald-100 px-2.5 py-2 text-emerald-800 font-semibold">
                  ✅ 1. Analyze repo
                </div>
                <div className={`rounded-md bg-white border px-2.5 py-2 font-semibold ${hasCoverage ? 'border-emerald-100 text-emerald-800' : 'border-amber-100 text-amber-800'}`}>
                  {hasCoverage ? '✅' : '⏳'} 2. Check verification
                </div>
                <div className={`rounded-md bg-white border px-2.5 py-2 font-semibold ${hasCreateHint ? 'border-emerald-100 text-emerald-800' : 'border-amber-100 text-amber-800'}`}>
                  {hasCreateHint ? '✅' : '⏳'} 3. Create split
                </div>
                <div className="rounded-md bg-white border border-amber-100 px-2.5 py-2 text-amber-800 font-semibold">
                  ⏳ 4. Pay contributors
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-purple-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer group shadow-sm overflow-hidden" onClick={() => sendMessage(`create split for ${repoName || 'this repo'}`)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                      <Plus className="w-4 h-4" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Reward Everyone</h4>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Automated distribution based on contributions</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs font-bold rounded-lg shadow-md shadow-purple-100"
                  >
                    Create Split
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-blue-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group shadow-sm overflow-hidden" onClick={() => sendMessage(`verify contributors for ${repoName || 'this repo'}`)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                      <Shield className="w-4 h-4" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Review Status</h4>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Check which contributors are verified</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full border-blue-200 text-blue-700 hover:bg-white h-8 text-xs font-bold rounded-lg"
                  >
                    Check Verification
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="bg-amber-50/80 backdrop-blur-sm rounded-xl p-3 flex items-start gap-3 border border-amber-100 shadow-sm">
            <div className="p-1.5 bg-amber-100 rounded-full">
              <Info className="w-3 h-3 text-amber-700" />
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
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
      const coverage = extractCoverage(msg.text);
      const hasCoverageGap = !!coverage && coverage.total > 0 && coverage.verified < coverage.total;
      
      return (
        <div className="max-w-[90%] bg-white rounded-2xl rounded-bl-md border border-purple-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 px-4 py-3 border-b border-purple-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-md shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-purple-700" />
              </div>
              <span className="text-xs font-bold text-purple-700 uppercase tracking-tight">Distribution Ready</span>
            </div>
          </div>
          <div className="p-4 space-y-5">
            <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50/50 p-4 rounded-xl border border-gray-100 italic shadow-inner leading-relaxed">
              {msg.text.split('🔗')[0]}
            </div>

            {deTerminalLink && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield className="w-12 h-12" />
                </div>
                <div className="flex items-center gap-2 text-blue-800 relative z-10">
                  <div className="p-1 bg-blue-100 rounded-md">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em]">Proof of Fairness</span>
                </div>
                <p className="text-xs text-blue-700/80 leading-relaxed font-medium relative z-10">
                  This split was computed within a <strong>Trusted Execution Environment (TEE)</strong>. The distribution is mathematically verifiable against GitHub commit logs.
                </p>
                <Button 
                  asChild
                  size="sm" 
                  variant="outline" 
                  className="w-full bg-white/80 backdrop-blur-sm border-blue-200 text-blue-700 hover:bg-white h-9 text-xs font-bold rounded-lg relative z-10 shadow-sm"
                >
                  <a href={deTerminalLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                    Verify on deTERMinal
                  </a>
                </Button>
              </div>
            )}
            
            <div className="pt-2 border-t border-gray-100 space-y-4">
              {hasCoverageGap ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 font-medium">
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
                      <div className="h-px flex-1 bg-gray-100"></div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Action Required</span>
                      <div className="h-px flex-1 bg-gray-100"></div>
                    </div>
                    <Button 
                      size="lg" 
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12 text-sm font-black rounded-xl shadow-xl shadow-green-100 border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                      onClick={() => sendMessage(`pay 10 USDC to ${repoName || 'this repo'}`)}
                    >
                      <DollarSign className="w-5 h-5 mr-2" />
                      FUND & DISTRIBUTE NOW
                    </Button>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 h-9 text-xs font-bold border-gray-200 hover:bg-gray-50 rounded-lg"
                      onClick={() => sendMessage(`show distribution for ${repoName || 'this repo'}`)}
                    >
                      <Search className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                      View Shares
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 h-9 text-xs font-bold border-gray-200 hover:bg-gray-50 rounded-lg"
                      onClick={() => sendMessage(`regenerate split for ${repoName || 'this repo'}`)}
                    >
                      <RefreshCcw className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
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

    // Default agent message
    return (
      <div className="max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap text-sm bg-gray-100 text-gray-900 rounded-bl-md border border-gray-200 shadow-sm">
        {msg.text}
      </div>
    );
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange pt-20">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-blue-200 rounded-full px-4 py-1.5 text-sm text-blue-700 mb-4">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
              <Bot className="w-8 h-8 text-blue-600" />
              GitSplits Agent
            </h1>
            <p className="text-gray-600">Compensate open source contributors with natural language commands</p>
          </div>

          <div className="mb-4">
            <FlowStatusStrip steps={flowSteps} title="Contributor Payout Journey" />
          </div>

          {/* Chat Container */}
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardContent className="p-0">
              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white">
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
              <div className="border-t border-gray-200 p-4 bg-gray-50 sticky bottom-0 z-10">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command or question..."
                    className="flex-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 transition-all"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Press Enter to send • Commands: analyze, create, pay, verify
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
            <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">Example Commands</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {commandExamples.map((cmd) => (
                <button
                  key={cmd.command}
                  onClick={() => handleExampleClick(cmd.command)}
                  className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className={`p-2 rounded-lg ${getCategoryColor(cmd.category)} transition-transform group-hover:scale-110`}>
                    {cmd.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                      {cmd.command}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
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
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800">
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
