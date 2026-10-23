import { WebSocketServer } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import { config } from '../config.js';

/**
 * Browser  --(binary PCM16 16kHz mono frames)-->  this server
 *          --(sendRealtimeInput)-->  Gemini Live API
 * Gemini's input transcription comes back and is forwarded as JSON:
 *   { type: 'ready' | 'transcript' | 'turn_complete' | 'error' | 'closed' }
 */
export function attachLiveTranscription(server) {
  const wss = new WebSocketServer({ server, path: '/ws/transcribe' });

  wss.on('connection', (client) => {
    const send = (obj) => {
      if (client.readyState === 1) client.send(JSON.stringify(obj));
    };

    if (!config.geminiApiKey) {
      send({ type: 'error', message: 'GEMINI_API_KEY is not configured on the server.' });
      client.close();
      return;
    }

    let session = null;
    let ended = false;
    const pendingAudio = []; // audio that arrives before the Gemini session is ready

    const sendAudio = (b64) =>
      session.sendRealtimeInput({
        audio: { data: b64, mimeType: 'audio/pcm;rate=16000' },
      });

    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    ai.live
      .connect({
        model: config.geminiModel,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction:
            'You are a silent listener for a transcription tool. The speaker may mix Hindi and English. Do not reply.',
        },
        callbacks: {
          onopen: () => send({ type: 'ready' }),
          onmessage: (msg) => {
            const sc = msg.serverContent;
            if (!sc) return;
            if (sc.inputTranscription?.text) {
              send({ type: 'transcript', text: sc.inputTranscription.text });
            }
            if (sc.turnComplete || sc.generationComplete) {
              send({ type: 'turn_complete' });
            }
          },
          onerror: (e) => send({ type: 'error', message: e?.message || 'Gemini Live error' }),
          onclose: () => {
            send({ type: 'closed' });
            if (!ended) client.close();
          },
        },
      })
      .then((s) => {
        session = s;
        if (ended) return s.close();
        while (pendingAudio.length) sendAudio(pendingAudio.shift());
      })
      .catch((err) => {
        send({ type: 'error', message: err?.message || 'Could not connect to Gemini Live' });
        client.close();
      });

    client.on('message', (data, isBinary) => {
      if (isBinary) {
        const b64 = Buffer.from(data).toString('base64');
        if (session) sendAudio(b64);
        else if (pendingAudio.length < 200) pendingAudio.push(b64);
        return;
      }
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'stop' && session) {
          session.sendRealtimeInput({ audioStreamEnd: true });
          // give Gemini a moment to flush the trailing transcription
          setTimeout(() => session?.close(), 2500);
        }
      } catch {
        /* ignore malformed control frames */
      }
    });

    client.on('close', () => {
      ended = true;
      try {
        session?.close();
      } catch {
        /* already closed */
      }
    });
  });
}
