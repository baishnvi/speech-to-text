import { useEffect, useRef } from 'react';
import { useLiveTranscription } from '../hooks/useLiveTranscription.js';
import { formatDuration } from '../utils.js';

const LABELS = {
  idle: 'Press the mic and start speaking',
  connecting: 'Connecting…',
  listening: 'Listening — speak in Hindi, English, or both',
  finishing: 'Finishing up…',
};

export default function Recorder({ onFinished, notice }) {
  const { status, segments, partial, level, seconds, error, start, stop } =
    useLiveTranscription({ onFinished });
  const stageRef = useRef(null);

  useEffect(() => {
    stageRef.current?.scrollTo({ top: stageRef.current.scrollHeight });
  }, [segments, partial]);

  const active = status === 'listening';
  const busy = status === 'connecting' || status === 'finishing';
  const empty = segments.length === 0 && !partial;

  return (
    <section className="recorder" aria-labelledby="rec-title">
      <h2 id="rec-title">Live transcript</h2>

      <div className="stage" ref={stageRef} aria-live="polite">
        {empty ? (
          <p className="stage-empty">
            {notice || 'Your words will appear here as you speak. When you stop, the transcript is saved to your history.'}
          </p>
        ) : (
          <p className="stage-text">
            {segments.map((s, i) => (
              <span key={i}>{s} </span>
            ))}
            <span className="partial">{partial}</span>
          </p>
        )}
      </div>

      <div className="controls">
        <button
          className={`mic ${active ? 'is-live' : ''}`}
          onClick={active ? stop : start}
          disabled={busy}
          aria-label={active ? 'Stop recording' : 'Start recording'}
          style={{ '--level': Math.min(1, level * 3) }}
        >
          <span className="mic-ring" />
          {active ? (
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4Zm6-4a1 1 0 1 1 2 0 8 8 0 0 1-7 7.94V21h2a1 1 0 1 1 0 2h-6a1 1 0 1 1 0-2h2v-2.06A8 8 0 0 1 4 11a1 1 0 1 1 2 0 6 6 0 0 0 12 0Z"
              />
            </svg>
          )}
        </button>
        <div className="status">
          <span>{LABELS[status]}</span>
          {active && <span className="timer">{formatDuration(seconds)}</span>}
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
