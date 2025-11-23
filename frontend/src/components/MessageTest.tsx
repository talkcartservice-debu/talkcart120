import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';

const MessageTest: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState('test-conversation-123');
  const [isConnected, setIsConnected] = useState(false);

  // Connect to socket when component mounts
  useEffect(() => {
    // In a real app, you would get the token and userId from your auth system
    const token = localStorage.getItem('token') || 'test-token';
    const userId = 'test-user-id';
    
    socketService.connect(token, userId)
      .then(() => {
        setIsConnected(true);
        console.log('Connected to socket service');
      })
      .catch((error) => {
        console.error('Failed to connect to socket service:', error);
      });

    // Listen for new messages
    const handleNewMessage = (data: any) => {
      console.log('Received message in test component:', data);
      setMessages(prev => [...prev, data]);
    };

    socketService.on('message:new', handleNewMessage);

    // Cleanup
    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.disconnect();
    };
  }, []);

  // Join conversation when conversationId changes
  useEffect(() => {
    if (isConnected && conversationId) {
      socketService.joinConversation(conversationId);
    }

    return () => {
      if (conversationId) {
        socketService.leaveConversation(conversationId);
      }
    };
  }, [isConnected, conversationId]);

  const sendMessage = () => {
    if (input.trim() && isConnected) {
      socketService.sendMessage(conversationId, {
        content: input,
        type: 'text'
      });
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h2>Message Test Component</h2>
      
      <div style={{ marginBottom: '10px' }}>
        <label>Conversation ID: </label>
        <input 
          type="text" 
          value={conversationId} 
          onChange={(e) => setConversationId(e.target.value)} 
          style={{ marginRight: '10px' }}
        />
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          style={{ marginRight: '10px', width: '300px' }}
        />
        <button onClick={sendMessage} disabled={!isConnected || !input.trim()}>
          Send Message
        </button>
      </div>
      
      <div>
        <h3>Messages:</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' }}>
          {messages.map((msg, index) => (
            <div key={index} style={{ marginBottom: '10px', padding: '5px', backgroundColor: '#f5f5f5' }}>
              <strong>Conversation:</strong> {msg.conversationId}<br/>
              <strong>Content:</strong> {msg.message?.content || msg.content}<br/>
              <strong>Sender:</strong> {msg.message?.senderId || 'Unknown'}<br/>
              <strong>Time:</strong> {msg.message?.createdAt || new Date().toISOString()}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: '10px' }}>
        <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
};

export default MessageTest;