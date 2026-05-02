import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { InputPage } from './pages/InputPage';
import { ResultsPage } from './pages/ResultsPage';
import { ChatPage } from './pages/ChatPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InputPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
