// components/ExpandableText.tsx
'use client';

import { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export const ExpandableText = ({ text, maxLength = 250, className = "" }: ExpandableTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (text.length <= maxLength) {
    return <p className={`whitespace-pre-wrap ${className}`}>{text}</p>;
  }
  
  return (
    <div>
      <p className={`whitespace-pre-wrap ${className}`}>
        {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      </p>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
      >
        {isExpanded ? 'Read less' : 'Read more'}
      </button>
    </div>
  );
};