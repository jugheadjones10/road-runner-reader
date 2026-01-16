import ePub from 'epubjs';
import type { Book as EpubBook, NavItem } from 'epubjs';
import { v4 as uuidv4 } from 'uuid';
import type { BookData, Chapter } from '../types';

export async function parseEpub(file: File): Promise<{
  book: BookData;
  fileData: ArrayBuffer;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const epub = ePub(arrayBuffer);
  await epub.ready;

  const metadata = await epub.loaded.metadata;
  const cover = await getCoverUrl(epub);

  const book: BookData = {
    id: uuidv4(),
    title: metadata.title || file.name.replace('.epub', ''),
    author: metadata.creator || 'Unknown Author',
    coverUrl: cover,
    addedAt: Date.now(),
    lastReadAt: null,
    progress: {
      chapterIndex: 0,
      wordIndex: 0,
      percentage: 0,
    },
  };

  epub.destroy();

  return { book, fileData: arrayBuffer };
}

async function getCoverUrl(epub: EpubBook): Promise<string | null> {
  try {
    const coverUrl = await epub.coverUrl();
    if (!coverUrl) return null;
    
    // Convert blob URL to base64 data URL for persistence
    const response = await fetch(coverUrl);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function loadEpubFromData(data: ArrayBuffer): Promise<EpubBook> {
  const epub = ePub(data);
  await epub.ready;
  return epub;
}

export async function getChapters(epub: EpubBook): Promise<Chapter[]> {
  const navigation = await epub.loaded.navigation;
  
  // Access spine - epub.js stores sections in spine.spineItems
  const spine = epub.spine as unknown as {
    spineItems: Array<{
      href: string;
      url: string;
      canonical: string;
      index: number;
      linear: boolean;
      load: (request: (url: string) => Promise<unknown>) => Promise<Element>;
      render: (request: (url: string) => Promise<unknown>) => Promise<string>;
      document?: Document;
    }>;
    each: (callback: (section: unknown) => void) => void;
    length: number;
  };
  
  const chapters: Chapter[] = [];
  
  // Get TOC items for chapter titles
  const tocItems = flattenToc(navigation.toc);
  
  // Get all spine items (sections)
  const sections = spine.spineItems || [];
  
  // Process each section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    try {
      // Use render() to get HTML string, then parse it
      const html = await section.render(epub.load.bind(epub));
      
      if (html && html.length > 0) {
        // Parse the HTML string to DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'application/xhtml+xml');
        
        // Check for parse errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
          // Try parsing as HTML instead
          const htmlDoc = parser.parseFromString(html, 'text/html');
          const content = extractTextFromDocument(htmlDoc);
          const words = tokenizeText(content);
          
          if (words.length > 0) {
            const tocEntry = findTocEntry(tocItems, section.href);
            chapters.push({
              id: section.href,
              title: tocEntry?.label?.trim() || `Section ${chapters.length + 1}`,
              href: section.href,
              content,
              words,
            });
          }
        } else {
          const content = extractTextFromDocument(doc);
          const words = tokenizeText(content);
          
          if (words.length > 0) {
            const tocEntry = findTocEntry(tocItems, section.href);
            chapters.push({
              id: section.href,
              title: tocEntry?.label?.trim() || `Section ${chapters.length + 1}`,
              href: section.href,
              content,
              words,
            });
          }
        }
      }
    } catch {
      // Silently skip sections that fail to load (e.g., CSS-only files)
      continue;
    }
  }

  return chapters;
}

function findTocEntry(tocItems: NavItem[], href: string): NavItem | undefined {
  return tocItems.find(toc => {
    const tocHref = toc.href.split('#')[0];
    return href.includes(tocHref) || tocHref.includes(href) || 
           href.endsWith(tocHref) || tocHref.endsWith(href);
  });
}

function flattenToc(toc: NavItem[]): NavItem[] {
  const result: NavItem[] = [];
  for (const item of toc) {
    result.push(item);
    if (item.subitems && item.subitems.length > 0) {
      result.push(...flattenToc(item.subitems));
    }
  }
  return result;
}

function extractTextFromDocument(doc: Document): string {
  // Remove scripts, styles, and other non-content elements
  const elementsToRemove = doc.querySelectorAll('script, style, nav, header, footer');
  elementsToRemove.forEach(el => el.remove());

  // Get text content from body
  const body = doc.body || doc.documentElement;
  return body?.textContent?.trim() || '';
}

export function tokenizeText(text: string): string[] {
  // Split by whitespace and filter empty strings
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word.length > 0);
}

export function calculateORP(word: string): number {
  // Optimal Recognition Point (ORP) calculation
  // Based on speedread algorithm: https://github.com/pasky/speedread
  // The ORP is positioned slightly left of center to aid rapid recognition
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;       // 2-5 letters: 2nd character
  if (len <= 9) return 2;       // 6-9 letters: 3rd character
  if (len <= 13) return 3;      // 10-13 letters: 4th character
  return 4;                     // 14+ letters: 5th character
}

export function calculateReadingTime(wordCount: number, wpm: number): number {
  // Returns time in seconds
  return (wordCount / wpm) * 60;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
