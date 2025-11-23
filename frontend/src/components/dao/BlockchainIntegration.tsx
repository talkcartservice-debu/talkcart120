import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { Button, Alert, CircularProgress, Card, Badge } from '@mui/material';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';

interface BlockchainIntegrationProps {
  daoId?: string;
  contractAddress?: string;
  proposalId?: string;
  onChainId?: string;
  networkId?: number;
}

const BlockchainIntegration: React.FC<BlockchainIntegrationProps> = ({
  daoId,
  contractAddress,
  proposalId,
  onChainId,
  networkId = 1,
}) => {
  const { connect, account, connected, chainId, switchChain } = useWeb3();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<{
    isMember: boolean;
    votingPower: string;
  } | null>(null);
  
  // Check if user needs to switch networks
  const needsNetworkSwitch = connected && chainId !== networkId;
  
  // Verify DAO membership when wallet is connected
  useEffect(() => {
    if (connected && account && contractAddress) {
      verifyMembership();
    }
  }, [connected, account, contractAddress, chainId]);
  
  // Verify membership on the blockchain
  const verifyMembership = async () => {
    if (!contractAddress || !connected) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Implement DAO API methods
      // const response = await api.dao.verifyMembership(contractAddress, networkId);
      // if (response.data.success) {
      //   setMembershipStatus(response.data.data);
      // } else {
      //   setError(response.data.error || 'Failed to verify membership');
      // }
      setError('DAO API methods not implemented yet');
    } catch (err) {
      setError('Error verifying membership');
      console.error('Membership verification error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Sync DAO data from blockchain
  const syncDaoFromBlockchain = async () => {
    if (!contractAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Implement DAO API methods
      // const response = await api.dao.syncFromBlockchain(contractAddress, networkId);
      // if (response.data.success) {
      //   // Refresh the page to show updated data
      //   router.reload();
      // } else {
      //   setError(response.data.error || 'Failed to sync DAO');
      // }
      setError('DAO API methods not implemented yet');
    } catch (err) {
      setError('Error syncing DAO data');
      console.error('DAO sync error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Create proposal on blockchain
  const createProposalOnBlockchain = async () => {
    if (!daoId || !proposalId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Implement DAO API methods
      // const response = await api.dao.createProposalOnChain(daoId, proposalId, networkId);
      // if (response.data.success) {
      //   // Refresh the page to show updated data
      //   router.reload();
      // } else {
      //   setError(response.data.error || 'Failed to create proposal on blockchain');
      // }
      setError('DAO API methods not implemented yet');
    } catch (err) {
      setError('Error creating proposal on blockchain');
      console.error('Proposal creation error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Vote on proposal on blockchain
  const voteOnBlockchain = async (vote: 'for' | 'against' | 'abstain') => {
    if (!proposalId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Implement DAO API methods
      // const response = await api.dao.voteOnChain(proposalId, vote, networkId);
      // if (response.data.success) {
      //   // Refresh the page to show updated data
      //   router.reload();
      // } else {
      //   setError(response.data.error || 'Failed to vote on blockchain');
      // }
      setError('DAO API methods not implemented yet');
    } catch (err) {
      setError('Error voting on blockchain');
      console.error('Voting error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle network switching
  const handleSwitchNetwork = async () => {
    if (!connected) {
      await connect();
    }
    
    if (chainId !== networkId) {
      await switchChain(networkId);
    }
  };
  
  if (!contractAddress) {
    return null;
  }
  
  return (
    <Card className="p-4 mb-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium mb-3">Blockchain Integration</h3>
      
      {error && (
        <Alert severity="error" className="mb-3">
          {error}
        </Alert>
      )}
      
      {!connected ? (
        <Button variant="contained" color="primary" onClick={connect} disabled={loading}>
          {loading ? <CircularProgress size={16} className="mr-2" /> : null}
          Connect Wallet
        </Button>
      ) : needsNetworkSwitch ? (
        <div className="mb-3">
          <Alert severity="warning" className="mb-2">
              Please switch to the correct network
            </Alert>
          <Button variant="contained" color="primary" onClick={handleSwitchNetwork} disabled={loading}>
            {loading ? <CircularProgress size={16} className="mr-2" /> : null}
            Switch to {networkId === 1 ? 'Ethereum' : networkId === 5 ? 'Goerli' : 
                      networkId === 137 ? 'Polygon' : networkId === 80001 ? 'Mumbai' : 'Correct Network'}
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center mb-3">
            <Badge color={membershipStatus?.isMember ? 'secondary' : 'error'} variant="dot" sx={{ marginRight: 2 }}>
              <span>{membershipStatus?.isMember ? 'Member' : 'Not a Member'}</span>
            </Badge>
            {membershipStatus?.isMember && (
              <span className="text-sm">
                Voting Power: {membershipStatus.votingPower}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outlined" 
              onClick={verifyMembership} 
              disabled={loading}
              size="small"
            >
              {loading ? <CircularProgress size={16} className="mr-2" /> : null}
              Verify Membership
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={syncDaoFromBlockchain} 
              disabled={loading}
              size="small"
            >
              {loading ? <CircularProgress size={16} className="mr-2" /> : null}
              Sync DAO Data
            </Button>
            
            {daoId && proposalId && (
              <Button 
                variant="outlined" 
                onClick={createProposalOnBlockchain} 
                disabled={loading || !membershipStatus?.isMember}
                size="small"
              >
                {loading ? <CircularProgress size={16} className="mr-2" /> : null}
                Create Proposal On-Chain
              </Button>
            )}
            
            {proposalId && onChainId && (
              <div className="flex gap-2 mt-2 w-full">
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => voteOnBlockchain('for')} 
                    disabled={loading || !membershipStatus?.isMember}
                    size="small"
                  >
                  {loading ? <CircularProgress size={16} className="mr-2" /> : null}
                  Vote For
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={() => voteOnBlockchain('against')} 
                    disabled={loading || !membershipStatus?.isMember}
                    size="small"
                  >
                  {loading ? <CircularProgress size={16} className="mr-2" /> : null}
                  Vote Against
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => voteOnBlockchain('abstain')} 
                    disabled={loading || !membershipStatus?.isMember}
                    size="small"
                  >
                  {loading ? <CircularProgress size={16} className="mr-2" /> : null}
                  Abstain
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default BlockchainIntegration;