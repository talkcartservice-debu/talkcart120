import React, { useState } from 'react';
import useMessages from '@/hooks/useMessages';

const MessageSearchTest: React.FC = () => {
  const { searchAllMessages, loading, error } = useMessages();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    try {
      const response = await searchAllMessages(query);
      setResults(response);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Global Message Search Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query"
          style={{ padding: '8px', marginRight: '10px', width: '300px' }}
        />
        <button 
          onClick={handleSearch} 
          disabled={loading || !query.trim()}
          style={{ padding: '8px 16px' }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}

      {results && (
        <div>
          <h3>Search Results</h3>
          <p>Total found: {results.data?.total || 0}</p>
          
          <div style={{ marginTop: '20px' }}>
            {results.data?.messages?.map((message: any) => (
              <div 
                key={message.id} 
                style={{ 
                  border: '1px solid #ddd', 
                  padding: '10px', 
                  margin: '10px 0',
                  borderRadius: '4px'
                }}
              >
                <div><strong>Content:</strong> {message.content}</div>
                <div><strong>Conversation:</strong> {message.conversation?.name}</div>
                <div><strong>Sender:</strong> {message.sender?.displayName}</div>
                <div><small>{new Date(message.createdAt).toLocaleString()}</small></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageSearchTest;