'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import Header from '@/components/shared/Header';
import { Search, Plus, DollarSign, Shield, Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'agent';
  text: string;
  timestamp?: Date;
}

interface CommandExample {
  command: string;
  description: string;
  icon: React.ReactNode;
  category: 'analyze' | 'create' | 'pay' | 'verify';
}

export default function AgentPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'agent', 
      text: 'Hello! I\'m GitSplits Agent. I can help you:\n\n• Analyze repository contributions\n• Create payment splits\n• Send payouts to contributors\n• Verify GitHub identities\n\nTry one of the example commands below or type your own!',
      timestamp: new Date()
    },
  ]);
  const [loading, setLoading] = useState(false);

  const commandExamples: CommandExample[] = [
    {
      command: 'analyze near/near-sdk-rs',
      description: 'View top contributors and activity',
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
      command: 'pay 100 USDC to near/near-sdk-rs',
      description: 'Distribute payments automatically',
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

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMessage, timestamp: new Date() }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMessage }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [...prev, { role: 'agent', text: data.response, timestamp: new Date() }]);
      } else {
        setMessages((prev) => [...prev, { role: 'agent', text: `❌ ${data.error}`, timestamp: new Date() }]);
      }
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: 'agent', text: `❌ Error: ${error.message}`, timestamp: new Date() }]);
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

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange pt-20">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">GitSplits Agent</h1>
            <p className="text-gray-600">Compensate open source contributors with natural language commands</p>
          </div>

          {/* Chat Container */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-0">
              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md border border-gray-200'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Processing...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command or question..."
                    className="flex-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
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
                  onClick={() => setInput(cmd.command)}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className={`p-2 rounded-lg ${getCategoryColor(cmd.category)}`}>
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
              <strong>Tip:</strong> You can also interact with the agent on X (Twitter) by mentioning @gitsplits or through Farcaster!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
