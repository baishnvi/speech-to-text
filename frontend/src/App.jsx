import { useCallback, useState } from 'react';
import { api } from './api.js';
import History from './components/History.jsx';
import Recorder from './components/Recorder.jsx';
import { detectLanguage } from './utils.js';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState('');

  const handleFinished = useCallback(async ({ text, duration }) => {
    try {
      await api.create({
        text,
        language: detectLanguage(text),
        duration_seconds: duration,
      });
      setNotice('Saved to your history.');
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setNotice(`Could not save the transcript: ${e.message}`);
    }
  }, []);

  return (
    <div className="shell">
      <header className="top">
        <h1>Bol</h1>
        <p>Speak in Hindi, English, or both. Watch it become text.</p>
      </header>
      <main className="layout">
        <Recorder onFinished={handleFinished} notice={notice} />
        <History refreshKey={refreshKey} />
      </main>
    </div>
  );
}
