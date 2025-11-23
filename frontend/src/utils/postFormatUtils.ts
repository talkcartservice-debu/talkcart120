/**
 * Formats post content by adding HTML tags for hashtags and mentions
 * @param content The post content text
 * @returns Formatted content with HTML tags for hashtags and mentions
 */
export const formatPostContent = (content: string): string => {
  if (!content) return '';

  // First, escape any HTML to prevent XSS
  let formattedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Replace URLs with clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formattedContent = formattedContent.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: var(--mui-palette-primary-main); text-decoration: underline;">$1</a>'
  );

  // Replace hashtags with styled spans
  formattedContent = formattedContent.replace(
    /#(\w+)/g, 
    '<span style="color: var(--mui-palette-primary-main); font-weight: 500; cursor: pointer;" onclick="window.location.href=\'/hashtag/$1\'">#$1</span>'
  );
  
  // Replace mentions with styled spans
  formattedContent = formattedContent.replace(
    /@(\w+)/g, 
    '<span style="color: var(--mui-palette-secondary-main); font-weight: 500; cursor: pointer;" onclick="window.location.href=\'/profile/$1\'">@$1</span>'
  );
  
  return formattedContent;
};

/**
 * Formats a URL to be displayed in a more user-friendly way
 * @param url The URL to format
 * @returns A formatted URL string
 */
export const formatUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    let formatted = urlObj.hostname;
    
    // Add path if it's not just "/"
    if (urlObj.pathname && urlObj.pathname !== '/') {
      // Truncate long paths
      const path = urlObj.pathname.length > 15 
        ? urlObj.pathname.substring(0, 15) + '...' 
        : urlObj.pathname;
      formatted += path;
    }
    
    return formatted;
  } catch (e) {
    // Return original if not a valid URL
    return url;
  }
};

/**
 * Detects URLs in text and returns them as an array
 * @param text The text to search for URLs
 * @returns An array of URLs found in the text
 */
export const extractUrls = (text: string): string[] => {
  if (!text) return [];
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};