import React from 'react';

interface FormatOptions {
  context?: 'post' | 'comment' | 'message';
  onMentionClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
}

export const formatTextWithMentions = (
  text: string, 
  options: FormatOptions = {}
): React.ReactNode => {
  if (!text) return text;

  // Split text by mentions (@username) and hashtags (#hashtag)
  const parts = text.split(/(@\w+|#\w+)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      // Mention
      const username = part.slice(1);
      return React.createElement(
        'span',
        {
          key: index,
          style: {
            color: '#f093fb',
            fontWeight: 600,
            cursor: 'pointer',
          },
          onClick: options.onMentionClick ? () => options.onMentionClick!(username) : undefined,
        },
        part
      );
    } else if (part.startsWith('#')) {
      // Hashtag
      const hashtag = part.slice(1);
      return React.createElement(
        'span',
        {
          key: index,
          style: {
            color: '#667eea',
            fontWeight: 600,
            cursor: 'pointer',
          },
          onClick: options.onHashtagClick ? () => options.onHashtagClick!(hashtag) : undefined,
        },
        part
      );
    } else {
      // Regular text
      return part;
    }
  });
};