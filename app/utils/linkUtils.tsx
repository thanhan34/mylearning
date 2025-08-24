import React from 'react';

// Function to detect URLs in text and make them clickable
export const renderTextWithLinks = (text: string): React.ReactNode => {
  if (!text) return text;

  // Split text by line breaks first to preserve formatting
  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Regular expression to match URLs (including Zoom links)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = line.split(urlRegex);
    
    const processedLine = parts.map((part, partIndex) => {
      if (urlRegex.test(part)) {
        // Check if it's a Zoom link
        const isZoomLink = part.includes('zoom.us') || part.includes('zoom.com');
        
        return (
          <a
            key={`${lineIndex}-${partIndex}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`${
              isZoomLink 
                ? 'text-blue-600 hover:text-blue-800 font-medium' 
                : 'text-[#fc5d01] hover:text-[#fd7f33]'
            } underline transition-colors duration-200`}
            onClick={(e) => e.stopPropagation()} // Prevent parent click events
          >
            {isZoomLink ? '🔗 Tham gia Zoom' : part}
          </a>
        );
      }
      return part;
    });

    // Add line break after each line except the last one
    return (
      <React.Fragment key={lineIndex}>
        {processedLine}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

// Function to extract the first URL from text
export const extractFirstUrl = (text: string): string | null => {
  if (!text) return null;
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  
  return match ? match[0] : null;
};
