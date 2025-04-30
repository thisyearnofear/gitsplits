import React, { useEffect, useState } from 'react';
import { gitSplitsContract } from '../utils/near-contract';

const NearContractDemo = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [isWorker, setIsWorker] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [splitId, setSplitId] = useState('');
  const [splitDetails, setSplitDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const initContract = async () => {
      try {
        await gitSplitsContract.init();
        const signedIn = gitSplitsContract.isSignedIn();
        setIsSignedIn(signedIn);
        
        if (signedIn) {
          const account = gitSplitsContract.getAccountId();
          setAccountId(account);
          
          // Check if the user is a registered worker
          const workerStatus = await gitSplitsContract.isWorkerRegistered(account);
          setIsWorker(workerStatus);
        }
      } catch (err) {
        console.error('Error initializing contract:', err);
        setError('Failed to initialize NEAR contract');
      }
    };

    initContract();
  }, []);

  const handleSignIn = async () => {
    try {
      await gitSplitsContract.signIn();
      // The page will redirect to NEAR Wallet
    } catch (err) {
      console.error('Error signing in:', err);
      setError('Failed to sign in with NEAR wallet');
    }
  };

  const handleSignOut = () => {
    try {
      gitSplitsContract.signOut();
      setIsSignedIn(false);
      setAccountId('');
      setIsWorker(false);
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out');
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
        alert('Successfully registered as a worker!');
      } else {
        setError('Failed to register as a worker');
      }
    } catch (err) {
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
        setSplitId(result);
        alert(`Split created with ID: ${result}`);
      } else {
        setError('Failed to create split');
      }
    } catch (err) {
      console.error('Error creating split:', err);
      setError(`Failed to create split: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetSplit = async () => {
    if (!splitId) {
      setError('Please enter a split ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await gitSplitsContract.getSplit(splitId);
      
      if (result) {
        setSplitDetails(result);
      } else {
        setError('Split not found');
        setSplitDetails(null);
      }
    } catch (err) {
      console.error('Error getting split:', err);
      setError(`Failed to get split: ${err.message}`);
      setSplitDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGetSplitByRepo = async () => {
    if (!repoUrl) {
      setError('Please enter a repository URL');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await gitSplitsContract.getSplitByRepo(repoUrl);
      
      if (result) {
        setSplitDetails(result);
        setSplitId(result.id);
      } else {
        setError('Split not found for this repository');
        setSplitDetails(null);
      }
    } catch (err) {
      console.error('Error getting split by repo:', err);
      setError(`Failed to get split by repo: ${err.message}`);
      setSplitDetails(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">GitSplits NEAR Contract Demo</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Authentication</h2>
        {isSignedIn ? (
          <div>
            <p className="mb-2">Signed in as: <strong>{accountId}</strong></p>
            <p className="mb-2">Worker status: <strong>{isWorker ? 'Registered' : 'Not registered'}</strong></p>
            <button 
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Sign Out
            </button>
            {!isWorker && (
              <button 
                onClick={handleRegisterWorker}
                disabled={loading}
                className="ml-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Register as Worker'}
              </button>
            )}
          </div>
        ) : (
          <button 
            onClick={handleSignIn}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Sign In with NEAR
          </button>
        )}
      </div>
      
      {isSignedIn && isWorker && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Create Split</h2>
            <div className="flex items-center">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="Repository URL (e.g., github.com/user/repo)"
                className="flex-grow p-2 border rounded mr-2"
              />
              <button 
                onClick={handleCreateSplit}
                disabled={loading || !repoUrl}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Split'}
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Get Split</h2>
            <div className="flex items-center mb-2">
              <input
                type="text"
                value={splitId}
                onChange={(e) => setSplitId(e.target.value)}
                placeholder="Split ID"
                className="flex-grow p-2 border rounded mr-2"
              />
              <button 
                onClick={handleGetSplit}
                disabled={loading || !splitId}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Get Split'}
              </button>
            </div>
            <button 
              onClick={handleGetSplitByRepo}
              disabled={loading || !repoUrl}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Get Split by Repo URL'}
            </button>
          </div>
          
          {splitDetails && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Split Details</h2>
              <div className="bg-gray-100 p-4 rounded">
                <p><strong>ID:</strong> {splitDetails.id}</p>
                <p><strong>Repository:</strong> {splitDetails.repo_url}</p>
                <p><strong>Owner:</strong> {splitDetails.owner}</p>
                <p><strong>Created:</strong> {new Date(splitDetails.created_at / 1000000).toLocaleString()}</p>
                <p><strong>Updated:</strong> {new Date(splitDetails.updated_at / 1000000).toLocaleString()}</p>
                <p><strong>Contributors:</strong> {splitDetails.contributors.length}</p>
                
                {splitDetails.contributors.length > 0 && (
                  <div className="mt-2">
                    <h3 className="font-semibold">Contributors List:</h3>
                    <ul className="list-disc pl-5">
                      {splitDetails.contributors.map((contributor, index) => (
                        <li key={index}>
                          {contributor.github_username} - {contributor.percentage / 1e24}%
                          {contributor.account_id && ` (${contributor.account_id})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NearContractDemo;
