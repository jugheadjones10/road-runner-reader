export interface BookData {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  addedAt: number;
  lastReadAt: number | null;
  progress: BookProgress;
}

export interface BookProgress {
  chapterIndex: number;
  wordIndex: number;
  percentage: number;
}

export interface Chapter {
  id: string;
  title: string;
  href: string;
  content: string;
  words: string[];
}

export interface ReadingPosition {
  chapterIndex: number;
  wordIndex: number;
}

export interface SpeedReaderState {
  isPlaying: boolean;
  wpm: number;
  currentWordIndex: number;
  totalWords: number;
}
