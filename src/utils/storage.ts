import localforage from 'localforage';
import type { BookData, BookProgress } from '../types';

// Configure localforage
localforage.config({
  name: 'epub-speed-reader',
  storeName: 'books',
});

const booksStore = localforage.createInstance({
  name: 'epub-speed-reader',
  storeName: 'books',
});

const filesStore = localforage.createInstance({
  name: 'epub-speed-reader',
  storeName: 'files',
});

export async function saveBook(book: BookData, fileData: ArrayBuffer): Promise<void> {
  await booksStore.setItem(book.id, book);
  await filesStore.setItem(book.id, fileData);
}

export async function getBook(id: string): Promise<BookData | null> {
  return await booksStore.getItem<BookData>(id);
}

export async function getBookFile(id: string): Promise<ArrayBuffer | null> {
  return await filesStore.getItem<ArrayBuffer>(id);
}

export async function getAllBooks(): Promise<BookData[]> {
  const books: BookData[] = [];
  await booksStore.iterate<BookData, void>((value) => {
    books.push(value);
  });
  return books.sort((a, b) => b.addedAt - a.addedAt);
}

export async function updateBookProgress(
  id: string,
  progress: BookProgress
): Promise<void> {
  const book = await getBook(id);
  if (book) {
    book.progress = progress;
    book.lastReadAt = Date.now();
    await booksStore.setItem(id, book);
  }
}

export async function deleteBook(id: string): Promise<void> {
  await booksStore.removeItem(id);
  await filesStore.removeItem(id);
}
