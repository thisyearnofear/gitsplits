'use client';

import { useState } from 'react';

export default function AgentPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: 'Hello! I\'m GitSplits. Try commands like:\n• analyze near/near-sdk-rs\n• create split for facebook/react\n• pay 100 USDC to near/near-sdk-rs' },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
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
        setMessages((prev) => [...prev, { role: 'agent', text: data.response }]);
      } else {
        setMessages((prev) => [...prev, { role: 'agent', text: `Error: ${data.error}` }]);
      }
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: 'agent', text: `Error: ${error.message}` }]);
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">GitSplits Agent</h1>
        <p className="text-gray-600 mb-6">Compensate open source contributors with natural language commands</p>

        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2 text-gray-500">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Try: analyze near/near-sdk-rs"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send. Commands: analyze, create, pay, verify
            </p>
          </div>
        </div>

        {/* Quick commands */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Commands</h3>
          <div className="flex flex-wrap gap-2">
            {[
              'analyze near/near-sdk-rs',
              'create split for facebook/react',
              'pay 100 USDC to near/near-sdk-rs',
              'verify my-github-username',
            ].map((cmd) => (
              <button
                key={cmd}
                onClick={() => setInput(cmd)}
                className="text-sm bg-white border border-gray-300 rounded-full px-3 py-1 hover:bg-gray-50"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
