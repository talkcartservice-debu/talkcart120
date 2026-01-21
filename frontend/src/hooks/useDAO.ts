import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '@/config';

interface Creator {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
}

interface DAO {
  id: string;
  name: string;
  symbol: string;
  description: string;
  logo: string;
  contractAddress: string;
  tokenAddress: string;
  memberCount: number;
  creator: Creator;
  createdAt: string;
}

interface DAOSummary {
  id: string;
  name: string;
  symbol: string;
  logo: string;
}

interface Proposer {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  walletAddress: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  dao: DAOSummary;
  proposer: Proposer;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotes: number;
  quorum: number;
  createdAt: string;
  endDate: string;
}

interface Vote {
  id: string;
  proposalId: string;
  voter: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  voteType: 'for' | 'against' | 'abstain';
  votePower: number;
  timestamp: string;
}

interface UseDAOReturn {
  daos: DAO[];
  proposals: Proposal[];
  loading: boolean;
  error: string | null;
  fetchDAOs: (query?: string) => Promise<void>;
  fetchProposals: (query?: string, daoId?: string, status?: string) => Promise<void>;
  fetchDAOById: (id: string) => Promise<DAO | null>;
  fetchProposalById: (id: string) => Promise<Proposal | null>;
  fetchVotes: (proposalId: string) => Promise<Vote[]>;
  castVote: (proposalId: string, voteType: 'for' | 'against' | 'abstain') => Promise<boolean>;
  createProposal: (daoId: string, title: string, description: string) => Promise<Proposal | null>;
}

export const useDAO = (): UseDAOReturn => {
  const [daos, setDAOs] = useState<DAO[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDAOs = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/dao`, {
        params: { search: query }
      });
      
      if (response.data.success) {
        setDAOs(response.data.data.daos);
      } else {
        setError('Failed to fetch DAOs');
        // Fallback to mock data for development
        setDAOs(mockDAOs);
      }
    } catch (err) {
      console.error('Error fetching DAOs:', err);
      setError('Failed to fetch DAOs. Please try again later.');
      // Fallback to mock data for development
      setDAOs(mockDAOs);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProposals = useCallback(async (query?: string, daoId?: string, status?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params: Record<string, string> = {};
      if (query) params.search = query;
      if (daoId) params.daoId = daoId;
      if (status) params.status = status;
      
      const response = await axios.get(`${API_URL}/dao/proposals`, { params });
      
      if (response.data.success) {
        setProposals(response.data.data.proposals);
      } else {
        setError('Failed to fetch proposals');
        // Fallback to mock data for development
        setProposals(mockProposals);
      }
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError('Failed to fetch proposals. Please try again later.');
      // Fallback to mock data for development
      setProposals(mockProposals);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDAOById = useCallback(async (id: string): Promise<DAO | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/dao/${id}`);
      
      if (response.data.success) {
        return response.data.data.dao;
      } else {
        setError('Failed to fetch DAO details');
        // Fallback to mock data for development
        const mockDAO = mockDAOs.find(d => d.id === id);
        return mockDAO || null;
      }
    } catch (err) {
      console.error('Error fetching DAO details:', err);
      setError('Failed to fetch DAO details. Please try again later.');
      // Fallback to mock data for development
      const mockDAO = mockDAOs.find(d => d.id === id);
      return mockDAO || null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProposalById = useCallback(async (id: string): Promise<Proposal | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/dao/proposals/${id}`);
      
      if (response.data.success) {
        return response.data.data.proposal;
      } else {
        setError('Failed to fetch proposal details');
        // Fallback to mock data for development
        const mockProposal = mockProposals.find(p => p.id === id);
        return mockProposal || null;
      }
    } catch (err) {
      console.error('Error fetching proposal details:', err);
      setError('Failed to fetch proposal details. Please try again later.');
      // Fallback to mock data for development
      const mockProposal = mockProposals.find(p => p.id === id);
      return mockProposal || null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVotes = useCallback(async (proposalId: string): Promise<Vote[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/dao/proposals/${proposalId}/votes`);
      
      if (response.data.success) {
        return response.data.data.votes;
      } else {
        setError('Failed to fetch votes');
        // Fallback to mock data for development
        return mockVotes.filter(v => v.proposalId === proposalId);
      }
    } catch (err) {
      console.error('Error fetching votes:', err);
      setError('Failed to fetch votes. Please try again later.');
      // Fallback to mock data for development
      return mockVotes.filter(v => v.proposalId === proposalId);
    } finally {
      setLoading(false);
    }
  }, []);

  const castVote = useCallback(async (proposalId: string, voteType: 'for' | 'against' | 'abstain'): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/dao/proposals/${proposalId}/vote`, {
        voteType
      });
      
      if (response.data.success) {
        // Update proposal in state with new vote counts
        setProposals(prev => 
          prev.map(proposal => {
            if (proposal.id === proposalId) {
              const updatedProposal = { ...proposal };
              
              if (voteType === 'for') {
                updatedProposal.votesFor += 1;
              } else if (voteType === 'against') {
                updatedProposal.votesAgainst += 1;
              } else {
                updatedProposal.votesAbstain += 1;
              }
              
              updatedProposal.totalVotes += 1;
              
              return updatedProposal;
            }
            return proposal;
          })
        );
        
        return true;
      } else {
        setError('Failed to cast vote');
        return false;
      }
    } catch (err) {
      console.error('Error casting vote:', err);
      setError('Failed to cast vote. Please try again later.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProposal = useCallback(async (daoId: string, title: string, description: string): Promise<Proposal | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/dao/proposals`, {
        daoId,
        title,
        description
      });
      
      if (response.data.success) {
        const newProposal = response.data.data.proposal;
        setProposals(prev => [newProposal, ...prev]);
        return newProposal;
      } else {
        setError('Failed to create proposal');
        return null;
      }
    } catch (err) {
      console.error('Error creating proposal:', err);
      setError('Failed to create proposal. Please try again later.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDAOs();
    fetchProposals();
  }, [fetchDAOs, fetchProposals]);

  return {
    daos,
    proposals,
    loading,
    error,
    fetchDAOs,
    fetchProposals,
    fetchDAOById,
    fetchProposalById,
    fetchVotes,
    castVote,
    createProposal
  };
};

// Mock data for development and fallback
const mockDAOs: DAO[] = [
  {
    id: '1',
    name: 'Vetora Governance',
    symbol: 'TCG',
    description: 'The official governance DAO for Vetora platform',
    logo: '/images/placeholder-image.png',
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    memberCount: 1250,
    creator: {
      id: 'user1',
      username: 'founder',
      displayName: 'Vetora Founder',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      isVerified: true,
    },
    createdAt: '2023-01-15T14:30:00Z',
  },
  {
    id: '2',
    name: 'Content Creators DAO',
    symbol: 'CCD',
    description: 'A DAO for content creators to collaborate and fund projects',
    logo: '/images/placeholder-image.png',
    contractAddress: '0x2345678901abcdef2345678901abcdef23456789',
    tokenAddress: '0xbcdef1234567890abcdef1234567890abcdef123',
    memberCount: 875,
    creator: {
      id: 'user2',
      username: 'creator',
      displayName: 'Top Creator',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      isVerified: true,
    },
    createdAt: '2023-02-20T10:15:00Z',
  },
  {
    id: '3',
    name: 'NFT Collectors',
    symbol: 'NFTC',
    description: 'A community of NFT collectors making decisions together',
    logo: '/images/placeholder-image.png',
    contractAddress: '0x3456789012abcdef3456789012abcdef34567890',
    tokenAddress: '0xcdef1234567890abcdef1234567890abcdef1234',
    memberCount: 532,
    creator: {
      id: 'user3',
      username: 'nftwhale',
      displayName: 'NFT Whale',
      avatar: 'https://randomuser.me/api/portraits/men/68.jpg',
      isVerified: false,
    },
    createdAt: '2023-03-10T18:45:00Z',
  },
];

const mockProposals: Proposal[] = [
  {
    id: '1',
    title: 'Implement Token Staking Rewards',
    description: 'Proposal to implement a staking rewards system for TCG token holders',
    status: 'active',
    dao: {
      id: '1',
      name: 'Vetora Governance',
      symbol: 'TCG',
      logo: '/images/placeholder-image.png',
    },
    proposer: {
      id: 'user1',
      username: 'founder',
      displayName: 'Vetora Founder',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      isVerified: true,
      walletAddress: '0x1234...5678',
    },
    votesFor: 750000,
    votesAgainst: 250000,
    votesAbstain: 50000,
    totalVotes: 1050000,
    quorum: 1500000,
    createdAt: '2023-06-15T14:30:00Z',
    endDate: '2023-06-22T14:30:00Z',
  },
  {
    id: '2',
    title: 'Fund Community Content Creation',
    description: 'Allocate 100,000 CCD tokens to fund community content creation initiatives',
    status: 'passed',
    dao: {
      id: '2',
      name: 'Content Creators DAO',
      symbol: 'CCD',
      logo: '/images/placeholder-image.png',
    },
    proposer: {
      id: 'user2',
      username: 'creator',
      displayName: 'Top Creator',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      isVerified: true,
      walletAddress: '0x2345...6789',
    },
    votesFor: 600000,
    votesAgainst: 100000,
    votesAbstain: 25000,
    totalVotes: 725000,
    quorum: 500000,
    createdAt: '2023-05-20T10:15:00Z',
    endDate: '2023-05-27T10:15:00Z',
  },
  {
    id: '3',
    title: 'Create NFT Curation Committee',
    description: 'Establish a committee to curate and promote high-quality NFTs in the marketplace',
    status: 'rejected',
    dao: {
      id: '3',
      name: 'NFT Collectors',
      symbol: 'NFTC',
      logo: '/images/placeholder-image.png',
    },
    proposer: {
      id: 'user3',
      username: 'nftwhale',
      displayName: 'NFT Whale',
      avatar: 'https://randomuser.me/api/portraits/men/68.jpg',
      isVerified: false,
      walletAddress: '0x3456...7890',
    },
    votesFor: 200000,
    votesAgainst: 300000,
    votesAbstain: 50000,
    totalVotes: 550000,
    quorum: 400000,
    createdAt: '2023-04-10T18:45:00Z',
    endDate: '2023-04-17T18:45:00Z',
  },
];

const mockVotes: Vote[] = [
  {
    id: 'vote1',
    proposalId: '1',
    voter: {
      id: 'user4',
      username: 'voter1',
      displayName: 'Voter One',
      avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
    },
    voteType: 'for',
    votePower: 50000,
    timestamp: '2023-06-16T10:30:00Z',
  },
  {
    id: 'vote2',
    proposalId: '1',
    voter: {
      id: 'user5',
      username: 'voter2',
      displayName: 'Voter Two',
      avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
    },
    voteType: 'against',
    votePower: 30000,
    timestamp: '2023-06-16T11:45:00Z',
  },
  {
    id: 'vote3',
    proposalId: '1',
    voter: {
      id: 'user6',
      username: 'voter3',
      displayName: 'Voter Three',
      avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
    },
    voteType: 'abstain',
    votePower: 20000,
    timestamp: '2023-06-16T14:20:00Z',
  },
];

export default useDAO;