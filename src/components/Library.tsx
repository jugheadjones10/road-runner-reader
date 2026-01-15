import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { BookData } from "../types";
import { getAllBooks, saveBook, deleteBook } from "../utils/storage";
import { parseEpub } from "../utils/epub";

export function Library() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setIsLoading(true);
    const allBooks = await getAllBooks();
    setBooks(allBooks);
    setIsLoading(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      if (file.name.endsWith(".epub")) {
        try {
          const { book, fileData } = await parseEpub(file);
          await saveBook(book, fileData);
        } catch (error) {
          console.error("Failed to parse EPUB:", error);
          alert(
            `Failed to upload "${file.name}". Please ensure it's a valid EPUB file.`
          );
        }
      }
    }

    await loadBooks();
    setIsUploading(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDeleteBook = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this book?")) {
      await deleteBook(bookId);
      await loadBooks();
    }
  };

  const openBook = (bookId: string) => {
    navigate(`/read/${bookId}`);
  };

  return (
    <div className="library">
      <header className="library-header">
        <div className="logo">
          <svg viewBox="0 0 32 32" className="logo-icon">
            <rect
              x="4"
              y="6"
              width="6"
              height="20"
              rx="1"
              fill="currentColor"
              opacity="0.6"
            />
            <rect
              x="13"
              y="4"
              width="6"
              height="24"
              rx="1"
              fill="currentColor"
              opacity="0.8"
            />
            <rect
              x="22"
              y="8"
              width="6"
              height="16"
              rx="1"
              fill="currentColor"
            />
          </svg>
          <h1>SpeedRead</h1>
        </div>
        <button
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <span className="spinner" />
              Uploading...
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload EPUB
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
          style={{ display: "none" }}
        />
      </header>

      <main
        className={`library-content ${isDragging ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="drop-overlay">
            <div className="drop-message">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Drop EPUB files here</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="loading-state">
            <span className="spinner large" />
            <p>Loading your library...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="empty-state">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2>Your library is empty</h2>
            <p>Upload an EPUB file to get started with speed reading</p>
            <button
              className="upload-btn large"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload your first book
            </button>
          </div>
        ) : (
          <div className="books-grid">
            {books.map((book) => (
              <div
                key={book.id}
                className="book-card"
                onClick={() => openBook(book.id)}
              >
                <div className="book-cover">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} />
                  ) : (
                    <div className="placeholder-cover">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                  {book.progress.percentage > 0 && (
                    <div className="progress-indicator">
                      <div
                        className="progress-bar"
                        style={{ width: `${book.progress.percentage}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="book-info">
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">{book.author}</p>
                </div>
                <button
                  className="delete-btn"
                  onClick={(e) => handleDeleteBook(e, book.id)}
                  title="Delete book"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
