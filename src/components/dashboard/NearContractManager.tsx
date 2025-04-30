import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Shield, AlertCircle, Check, Code, 
  RefreshCw, ExternalLink, Github 
} from "lucide-react";
import { gitSplitsContract } from '@/utils/near-contract';

const NearContractManager: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [isWorker, setIsWorker] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const initContract = async () => {
      try {
        await gitSplitsContract.init();
        setIsInitialized(true);
        const signedIn = gitSplitsContract.isSignedIn();
        setIsSignedIn(signedIn);
        
        if (signedIn) {
          const account = gitSplitsContract.getAccountId();
          setAccountId(account);
          
          // Check if the user is a registered worker
          const workerStatus = await gitSplitsContract.isWorkerRegistered(account);
          setIsWorker(workerStatus);
          
          // Load user's splits
          await loadSplits();
        }
      } catch (err) {
        console.error('Error initializing contract:', err);
        setError('Failed to initialize NEAR contract');
      }
    };

    initContract();
  }, []);

  const loadSplits = async () => {
    // This would be implemented to fetch splits from the contract
    // For now, we'll use placeholder data
    setSplits([
      {
        id: 'split-123',
        repoUrl: 'github.com/near/near-sdk-rs',
        owner: accountId,
        contributors: [
          { github_username: 'user1', percentage: 7000000000000000000000000 },
          { github_username: 'user2', percentage: 3000000000000000000000000 },
        ],
        created_at: Date.now() * 1000000,
      }
    ]);
  };

  const handleSignIn = async () => {
    try {
      await gitSplitsContract.signIn();
      // The page will redirect to NEAR Wallet
    } catch (err) {
      console.error('Error signing in:', err);
      setError('Failed to sign in with NEAR wallet');
    }
  };

  const handleRegisterWorker = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Simple attestation for demo purposes
      const attestation = {
        quote: 'test-quote',
        endorsements: 'test-endorsements'
      };
      
      const result = await gitSplitsContract.registerWorker(attestation, 'test-code-hash');
      
      if (result) {
        setIsWorker(true);
      } else {
        setError('Failed to register as a worker');
      }
    } catch (err: any) {
      console.error('Error registering worker:', err);
      setError(`Failed to register worker: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSplit = async () => {
    if (!repoUrl) {
      setError('Please enter a repository URL');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await gitSplitsContract.createSplit(repoUrl, accountId);
      
      if (result) {
        await loadSplits();
      } else {
        setError('Failed to create split');
      }
    } catch (err: any) {
      console.error('Error creating split:', err);
      setError(`Failed to create split: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contract Status Card */}
      <Card className={`border-l-4 ${isInitialized ? 'border-l-green-500' : 'border-l-amber-500'}`}>
        <CardContent className="flex items-center p-4">
          <div className={`mr-4 p-2 rounded-full ${isInitialized ? 'bg-green-100' : 'bg-amber-100'}`}>
            {isInitialized ? (
              <Shield className="h-6 w-6 text-green-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-500" />
            )}
          </div>
          <div>
            <h3 className="font-medium">
              {isInitialized ? 'NEAR Contract Connected' : 'NEAR Contract Not Connected'}
            </h3>
            <p className="text-sm text-gray-600">
              {isInitialized 
                ? `Connected to contract: gitsplits-test.testnet` 
                : 'Please connect to the NEAR contract to manage your splits'}
            </p>
          </div>
          {!isSignedIn && isInitialized && (
            <Button className="ml-auto" onClick={handleSignIn}>
              Sign In with NEAR
            </Button>
          )}
          {isSignedIn && !isWorker && (
            <Button 
              className="ml-auto" 
              onClick={handleRegisterWorker}
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register as Worker'}
            </Button>
          )}
          {isSignedIn && isWorker && (
            <div className="ml-auto flex items-center text-green-600">
              <Check className="mr-1 h-5 w-5" /> Registered Worker
            </div>
          )}
        </CardContent>
      </Card>

      {isSignedIn && isWorker && (
        <>
          {/* Create Split Card */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Split</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter GitHub repository URL"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="flex-grow"
                />
                <Button 
                  onClick={handleCreateSplit}
                  disabled={loading || !repoUrl}
                >
                  {loading ? 'Creating...' : 'Create Split'}
                </Button>
              </div>
              {error && (
                <div className="mt-2 text-red-500 text-sm">{error}</div>
              )}
            </CardContent>
          </Card>

          {/* Splits Table Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Contract Splits</CardTitle>
            </CardHeader>
            <CardContent>
              {splits.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repository</TableHead>
                      <TableHead>Split ID</TableHead>
                      <TableHead>Contributors</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {splits.map((split) => (
                      <TableRow key={split.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Github className="mr-2 h-4 w-4" />
                            {split.repoUrl}
                          </div>
                        </TableCell>
                        <TableCell>{split.id}</TableCell>
                        <TableCell>{split.contributors.length}</TableCell>
                        <TableCell>{new Date(split.created_at / 1000000).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Code className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Contract Splits Yet</h3>
                  <p className="text-gray-500 mb-4">
                    You haven't created any splits through the NEAR contract yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Contract Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>About NEAR Contract Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            The GitSplits NEAR contract provides secure, on-chain management of repository splits and distributions.
            It runs in a Trusted Execution Environment (TEE) for maximum security.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-medium mb-2">Contract ID</h4>
              <code className="text-sm">gitsplits-test.testnet</code>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-medium mb-2">Network</h4>
              <span>NEAR Testnet</span>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => window.open('https://testnet.nearblocks.io/address/gitsplits-test.testnet', '_blank')}>
              View on Explorer <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NearContractManager;
