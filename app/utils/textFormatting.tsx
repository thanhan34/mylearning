import { ReactNode } from 'react';

/**
 * Converts URLs in text to clickable links
 * @param text The text containing URLs to convert
 * @returns An array of React nodes with URLs converted to links
 */
export const convertUrlsToLinks = (text: string): ReactNode[] => {
  if (!text) return [text];
  
  // Regular expression to match URLs
  // This regex matches http, https, and www URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
  
  // Create a copy of the text to work with
  let remainingText = text;
  const result: ReactNode[] = [];
  let match;
  let lastIndex = 0;
  
  // Use exec to find each match and its position
  while ((match = urlRegex.exec(text)) !== null) {
    // Add the text before the URL
    if (match.index > lastIndex) {
      result.push(text.substring(lastIndex, match.index));
    }
    
    // Get the matched URL
    const url = match[0];
    const href = url.startsWith('www.') ? `https://${url}` : url;
    
    // Add the URL as a link
    result.push(
      <a 
        key={`url-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#fc5d01] hover:text-[#fd7f33] underline"
      >
        {url}
      </a>
    );
    
    // Update the last index
    lastIndex = match.index + url.length;
  }
  
  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }
  
  return result;
};
