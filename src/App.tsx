import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Library } from './components/Library';
import { BookReader } from './components/BookReader';
import './App.css';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/read/:bookId" element={<BookReader />} />
        </Routes>
      </BrowserRouter>
      <Analytics />
    </>
  );
}

export default App;
