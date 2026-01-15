import { useEffect, useRef, useCallback, useState } from 'react';
import { calculateORP, formatTime, calculateReadingTime } from '../utils/epub';

interface SpeedReaderProps {
  words: string[];
  currentIndex: number;
  isPlaying: boolean;
  wpm: number;
  onIndexChange: (index: number) => void;
  onPlayPause: () => void;
  onWpmChange: (wpm: number) => void;
  onSeek: (index: number) => void;
}

export function SpeedReader({
  words,
  currentIndex,
  isPlaying,
  wpm,
  onIndexChange,
  onPlayPause,
  onWpmChange,
  onSeek,
}: SpeedReaderProps) {
  const timerRef = useRef<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  const currentWord = words[currentIndex] || '';
  const orpIndex = calculateORP(currentWord);
  
  const totalTime = calculateReadingTime(words.length, wpm);
  const currentTime = calculateReadingTime(currentIndex, wpm);
  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  const advance = useCallback(() => {
    if (currentIndex < words.length - 1) {
      onIndexChange(currentIndex + 1);
    } else {
      onPlayPause(); // Stop at end
    }
  }, [currentIndex, words.length, onIndexChange, onPlayPause]);

  useEffect(() => {
    if (isPlaying) {
      const interval = (60 / wpm) * 1000; // ms per word
      timerRef.current = window.setInterval(advance, interval);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, wpm, advance]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newIndex = Math.floor(percentage * words.length);
    onSeek(Math.max(0, Math.min(newIndex, words.length - 1)));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      onPlayPause();
    } else if (e.code === 'ArrowRight') {
      onSeek(Math.min(currentIndex + 10, words.length - 1));
    } else if (e.code === 'ArrowLeft') {
      onSeek(Math.max(currentIndex - 10, 0));
    } else if (e.code === 'ArrowUp') {
      onWpmChange(Math.min(wpm + 50, 1200));
    } else if (e.code === 'ArrowDown') {
      onWpmChange(Math.max(wpm - 50, 100));
    }
  }, [onPlayPause, onSeek, onWpmChange, currentIndex, words.length, wpm]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderWord = () => {
    if (!currentWord) return null;

    const before = currentWord.slice(0, orpIndex);
    const orp = currentWord[orpIndex] || '';
    const after = currentWord.slice(orpIndex + 1);

    return (
      <div className="speed-word">
        <span className="word-before">{before}</span>
        <span className="word-orp">{orp}</span>
        <span className="word-after">{after}</span>
      </div>
    );
  };

  return (
    <div 
      className="speed-reader"
      onMouseMove={handleMouseMove}
      onClick={() => !showControls && setShowControls(true)}
    >
      {/* Focus guide lines */}
      <div className="focus-guide">
        <div className="guide-line guide-top" />
        <div className="guide-line guide-bottom" />
        <div className="guide-marker" />
      </div>

      {/* Word display */}
      <div className="word-container">
        {renderWord()}
      </div>

      {/* Controls overlay */}
      <div className={`speed-controls ${showControls ? 'visible' : 'hidden'}`}>
        {/* Progress bar */}
        <div className="progress-container" onClick={handleProgressClick}>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="controls-row">
          <div className="controls-left">
            <button className="control-btn play-btn" onClick={onPlayPause}>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(totalTime)}
            </span>
          </div>

          <div className="controls-right">
            <div className="wpm-control">
              <button 
                className="wpm-btn"
                onClick={() => onWpmChange(Math.max(wpm - 50, 100))}
              >
                −
              </button>
              <span className="wpm-display">{wpm} wpm</span>
              <button 
                className="wpm-btn"
                onClick={() => onWpmChange(Math.min(wpm + 50, 1200))}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
