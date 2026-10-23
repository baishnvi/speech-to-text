import { useCallback, useRef, useState } from 'react';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Streams microphone audio to the backend over WebSocket and exposes the
 * live transcript. Calls onFinished({ text, duration }) when recording stops.
 */
export function useLiveTranscription({ onFinished }) {
  const [status, setStatus] = useState('idle'); // idle | connecting | listening | finishing
  const [segments, setSegments] = useState([]);
  const [partial, setPartial] = useState('');
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  const r = useRef({
    status: 'idle',
    ws: null,
    ctx: null,
    stream: null,
    timer: null,
    startedAt: 0,
    ready: false,
    segments: [],
    partial: '',
  });

  const setStatusBoth = (s) => {
    r.current.status = s;
    setStatus(s);
  };

  const commitPartial = () => {
    const t = r.current.partial.trim();
    if (t) {
      r.current.segments = [...r.current.segments, t];
      setSegments(r.current.segments);
    }
    r.current.partial = '';
    setPartial('');
  };

  const stopAudio = () => {
    clearInterval(r.current.timer);
    r.current.stream?.getTracks().forEach((t) => t.stop());
    r.current.ctx?.close().catch(() => {});
    r.current.stream = null;
    r.current.ctx = null;
    setLevel(0);
  };

  const fail = (message) => {
    setError(message);
    stopAudio();
    r.current.ws?.close();
    r.current.ws = null;
    setStatusBoth('idle');
  };

  const start = useCallback(async () => {
    if (r.current.status !== 'idle') return;
    setError('');
    setSegments([]);
    setPartial('');
    setSeconds(0);
    r.current.segments = [];
    r.current.partial = '';
    r.current.ready = false;
    setStatusBoth('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      r.current.stream = stream;

      const ctx = new AudioContext();
      r.current.ctx = ctx;
      await ctx.audioWorklet.addModule('/pcm-worklet.js');

      const source = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, 'pcm-processor');
      const mute = ctx.createGain();
      mute.gain.value = 0;
      source.connect(node);
      node.connect(mute);
      mute.connect(ctx.destination);

      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${location.host}/ws/transcribe`);
      ws.binaryType = 'arraybuffer';
      r.current.ws = ws;

      node.port.onmessage = (e) => {
        setLevel(e.data.level);
        if (ws.readyState === 1 && r.current.ready) ws.send(e.data.pcm);
      };

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'ready') {
          r.current.ready = true;
          r.current.startedAt = Date.now();
          r.current.timer = setInterval(
            () => setSeconds(Math.round((Date.now() - r.current.startedAt) / 1000)),
            500
          );
          setStatusBoth('listening');
        } else if (msg.type === 'transcript') {
          r.current.partial += msg.text;
          setPartial(r.current.partial);
        } else if (msg.type === 'turn_complete') {
          commitPartial();
        } else if (msg.type === 'error') {
          fail(msg.message);
        }
      };
      ws.onerror = () => fail('Could not reach the transcription server.');
      ws.onclose = () => {
        if (r.current.status === 'listening' || r.current.status === 'connecting')
          fail('The connection closed. Press the mic to start again.');
      };
    } catch (err) {
      fail(
        err?.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow it in your browser and try again.'
          : err.message || 'Could not start recording.'
      );
    }
  }, []);

  const stop = useCallback(async () => {
    if (r.current.status !== 'listening') return;
    const duration = Math.round((Date.now() - r.current.startedAt) / 1000);
    setStatusBoth('finishing');
    stopAudio();
    r.current.ws?.send(JSON.stringify({ type: 'stop' }));
    await sleep(2000); // let the last words arrive
    commitPartial();
    const text = r.current.segments.join(' ').trim();
    r.current.ws?.close();
    r.current.ws = null;
    setStatusBoth('idle');
    if (text) await onFinished({ text, duration });
  }, [onFinished]);

  return { status, segments, partial, level, seconds, error, start, stop };
}
