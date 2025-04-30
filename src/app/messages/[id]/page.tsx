"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Twitter } from "lucide-react";
import Link from "next/link";

export default function MessagePage() {
  const params = useParams();
  const messageId = params.id as string;
  
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would fetch the message from an API
    // For now, we'll simulate a delay and then show a mock message
    const fetchMessage = async () => {
      try {
        setLoading(true);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock message based on ID
        if (messageId.startsWith('msg-')) {
          setMessage(`This is the full message for ID: ${messageId}. In a real implementation, this would be fetched from a database.`);
        } else {
          setError('Message not found');
        }
      } catch (err) {
        setError('Failed to load message');
        console.error('Error fetching message:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [messageId]);

  return (
    <div className="container max-w-4xl py-12">
      <Link href="/" className="flex items-center text-sm text-muted-foreground mb-6 hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to home
      </Link>
      
      <Card>
        <CardHeader>
          <CardTitle>Message Details</CardTitle>
          <CardDescription>
            Full message content from Twitter interaction
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <div className="whitespace-pre-wrap">{message}</div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/">
              Home
            </Link>
          </Button>
          
          <Button asChild>
            <a href="https://twitter.com/gitsplits" target="_blank" rel="noopener noreferrer">
              <Twitter className="mr-2 h-4 w-4" />
              Follow on Twitter
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
