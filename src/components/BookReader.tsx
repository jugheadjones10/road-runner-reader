import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { BookData, Chapter, ReadingPosition } from '../types';
import { getBook, getBookFile, updateBookProgress } from '../utils/storage';
import { loadEpubFromData, getChapters } from '../utils/epub';
import { SpeedReader } from './SpeedReader';
import { TextViewer } from './TextViewer';

type ViewMode = 'speed' | 'text' | 'split';

export function BookReader() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<BookData | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [viewMode, setViewMode] = useState<ViewMode>('speed');
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentChapter = chapters[currentChapterIndex];
  const words = currentChapter?.words || [];

  useEffect(() => {
    loadBook();
  }, [bookId]);

  const loadBook = async () => {
    if (!bookId) return;

    setIsLoading(true);
    setError(null);

    try {
      const bookData = await getBook(bookId);
      if (!bookData) {
        setError('Book not found');
        return;
      }
      setBook(bookData);

      const fileData = await getBookFile(bookId);
      if (!fileData) {
        setError('Book file not found');
        return;
      }

      const epub = await loadEpubFromData(fileData);
      const chaptersData = await getChapters(epub);
      setChapters(chaptersData);

      // Restore reading position
      if (bookData.progress) {
        setCurrentChapterIndex(bookData.progress.chapterIndex);
        setCurrentWordIndex(bookData.progress.wordIndex);
      }

      epub.destroy();
    } catch (err) {
      console.error('Failed to load book:', err);
      setError('Failed to load book');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProgress = useCallback(async (position: ReadingPosition) => {
    if (!bookId || chapters.length === 0) return;

    // Calculate total progress
    let totalWordsBefore = 0;
    let totalWords = 0;

    chapters.forEach((chapter, idx) => {
      if (idx < position.chapterIndex) {
        totalWordsBefore += chapter.words.length;
      } else if (idx === position.chapterIndex) {
        totalWordsBefore += position.wordIndex;
      }
      totalWords += chapter.words.length;
    });

    const percentage = totalWords > 0 ? (totalWordsBefore / totalWords) * 100 : 0;

    await updateBookProgress(bookId, {
      chapterIndex: position.chapterIndex,
      wordIndex: position.wordIndex,
      percentage,
    });
  }, [bookId, chapters]);

  // Auto-save progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      saveProgress({ chapterIndex: currentChapterIndex, wordIndex: currentWordIndex });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentChapterIndex, currentWordIndex, saveProgress]);

  const handleWordIndexChange = (index: number) => {
    setCurrentWordIndex(index);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (index: number) => {
    setCurrentWordIndex(index);
  };

  const handleWordClick = (index: number) => {
    setCurrentWordIndex(index);
    // Optionally switch to speed reader mode
  };

  const handleChapterChange = (index: number) => {
    setCurrentChapterIndex(index);
    setCurrentWordIndex(0);
    setIsPlaying(false);
    saveProgress({ chapterIndex: index, wordIndex: 0 });
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      handleChapterChange(currentChapterIndex + 1);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      handleChapterChange(currentChapterIndex - 1);
    }
  };

  // Auto-advance to next chapter when current chapter ends
  useEffect(() => {
    if (isPlaying && currentWordIndex >= words.length - 1 && currentChapterIndex < chapters.length - 1) {
      // Small delay before advancing
      const timeout = setTimeout(() => {
        handleChapterChange(currentChapterIndex + 1);
        setIsPlaying(true);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentWordIndex, words.length, isPlaying, currentChapterIndex, chapters.length]);

  if (isLoading) {
    return (
      <div className="book-reader loading">
        <span className="spinner large" />
        <p>Loading book...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="book-reader error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to Library</button>
      </div>
    );
  }

  return (
    <div className={`book-reader view-${viewMode}`}>
      {/* Header */}
      <header className="reader-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="header-center">
          <h1 className="book-title">{book?.title}</h1>
          <span className="chapter-title">{currentChapter?.title}</span>
        </div>

        <div className="header-right">
          <div className="view-toggle">
            <button
              className={viewMode === 'speed' ? 'active' : ''}
              onClick={() => setViewMode('speed')}
              title="Speed Reader"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                <polygon points="10,8 16,12 10,16" />
              </svg>
            </button>
            <button
              className={viewMode === 'text' ? 'active' : ''}
              onClick={() => setViewMode('text')}
              title="Text View"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="15" y2="18" />
              </svg>
            </button>
            <button
              className={viewMode === 'split' ? 'active' : ''}
              onClick={() => setViewMode('split')}
              title="Split View"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            </button>
          </div>

          <button 
            className="chapters-btn"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`chapters-sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Chapters</h2>
          <button onClick={() => setShowSidebar(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <ul className="chapters-list">
          {chapters.map((chapter, index) => (
            <li key={chapter.id}>
              <button
                className={index === currentChapterIndex ? 'active' : ''}
                onClick={() => {
                  handleChapterChange(index);
                  setShowSidebar(false);
                }}
              >
                <span className="chapter-number">{index + 1}</span>
                <span className="chapter-name">{chapter.title}</span>
                <span className="word-count">{chapter.words.length} words</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main content */}
      <main className="reader-content">
        {(viewMode === 'speed' || viewMode === 'split') && (
          <div className="speed-reader-container">
            <SpeedReader
              words={words}
              currentIndex={currentWordIndex}
              isPlaying={isPlaying}
              wpm={wpm}
              onIndexChange={handleWordIndexChange}
              onPlayPause={handlePlayPause}
              onWpmChange={setWpm}
              onSeek={handleSeek}
            />
          </div>
        )}

        {(viewMode === 'text' || viewMode === 'split') && (
          <div className="text-viewer-container">
            <TextViewer
              words={words}
              currentIndex={currentWordIndex}
              onWordClick={handleWordClick}
            />
          </div>
        )}
      </main>

      {/* Chapter navigation */}
      <nav className="chapter-nav">
        <button
          onClick={handlePrevChapter}
          disabled={currentChapterIndex === 0}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Previous
        </button>
        <span className="chapter-indicator">
          {currentChapterIndex + 1} / {chapters.length}
        </span>
        <button
          onClick={handleNextChapter}
          disabled={currentChapterIndex === chapters.length - 1}
        >
          Next
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </nav>

      {/* Overlay for sidebar */}
      {showSidebar && (
        <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />
      )}
    </div>
  );
}
