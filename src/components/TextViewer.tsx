import { useEffect, useRef } from 'react';

interface TextViewerProps {
  words: string[];
  currentIndex: number;
  onWordClick: (index: number) => void;
}

export function TextViewer({ words, currentIndex, onWordClick }: TextViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeWord = activeWordRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const wordRect = activeWord.getBoundingClientRect();
      
      // Check if word is outside visible area
      if (wordRect.top < containerRect.top || wordRect.bottom > containerRect.bottom) {
        activeWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex]);

  // Group words into paragraphs (roughly every 100 words or so for readability)
  const renderText = () => {
    const elements: JSX.Element[] = [];
    let currentParagraph: JSX.Element[] = [];
    
    words.forEach((word, index) => {
      const isActive = index === currentIndex;
      const isPast = index < currentIndex;
      
      currentParagraph.push(
        <span
          key={index}
          ref={isActive ? activeWordRef : null}
          className={`word ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
          onClick={() => onWordClick(index)}
        >
          {word}
        </span>
      );
      
      // Add space
      if (index < words.length - 1) {
        currentParagraph.push(<span key={`space-${index}`} className="space"> </span>);
      }
      
      // Check for natural paragraph breaks (period followed by capital letter or specific patterns)
      const nextWord = words[index + 1];
      if (
        nextWord && 
        (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) &&
        nextWord[0] === nextWord[0].toUpperCase() &&
        (index + 1) % 50 < 10 // Rough grouping
      ) {
        // Create a subtle visual break but keep the paragraph
      }
    });
    
    if (currentParagraph.length > 0) {
      elements.push(
        <p key="main-paragraph" className="text-paragraph">
          {currentParagraph}
        </p>
      );
    }
    
    return elements;
  };

  return (
    <div className="text-viewer" ref={containerRef}>
      <div className="text-content">
        {renderText()}
      </div>
    </div>
  );
}
