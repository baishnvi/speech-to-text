# Bolo — Real-time Hindi + English Speech to Text

Speak into your mic and watch the words appear live. Mixed Hindi/English works.
Every recording is saved to PostgreSQL and managed from a history dashboard
(create, read, update, delete, search, pagination).

## How it works

```
Browser mic ──AudioWorklet (16 kHz PCM16)──► WebSocket /ws/transcribe
                                                   │
                                      Node/Express │  @google/genai
                                                   ▼
                                           Gemini Live API
                                     (inputAudioTranscription)
                                                   │
Live transcript (JSON frames) ◄────────────────────┘

On stop ──► POST /api/transcriptions ──► PostgreSQL
Dashboard ◄── GET/PUT/DELETE /api/transcriptions
```

- **Frontend:** React 18 + Vite
- **Backend:** Node.js, Express, `ws`, `pg`
- **Database:** PostgreSQL (schema auto-created on startup)
- **STT:** Gemini Live API (free key from Google AI Studio)

## Project structure

```
speech-to-text/
├── backend/
│   ├── sql/schema.sql              table + index
│   └── src/
│       ├── server.js               Express app, static hosting, error handler
│       ├── config.js               env config
│       ├── db.js                   pg pool + schema init
│       ├── routes/transcriptions.js   CRUD REST API
│       └── ws/liveTranscribe.js    browser <-> Gemini Live bridge
├── frontend/
│   ├── public/pcm-worklet.js       mic -> 16 kHz PCM16 frames
│   └── src/
│       ├── App.jsx
│       ├── api.js, utils.js
│       ├── hooks/useLiveTranscription.js
│       └── components/Recorder.jsx, History.jsx
├── Dockerfile                      single image: API + built UI
├── docker-compose.yml              app + Postgres
└── render.yaml                     one-click Render blueprint
```

## Run locally

Prerequisites: Node 20+, PostgreSQL (or Docker), a Gemini API key.

```bash
# 1. Database (skip if you already have Postgres)
docker run -d --name stt-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=speech_to_text postgres:16-alpine

# 2. Backend
cd backend
cp .env.example .env        # add GEMINI_API_KEY
npm install
npm run dev                 # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173  (proxies /api and /ws)
```

Or everything with Docker:

```bash
GEMINI_API_KEY=your_key docker compose up --build   # http://localhost:4000
```

## REST API

| Method | Endpoint                         | Description                                  |
| ------ | -------------------------------- | -------------------------------------------- |
| GET    | `/api/transcriptions`            | List. Query: `page`, `limit`, `search`       |
| GET    | `/api/transcriptions/:id`        | Get one                                      |
| POST   | `/api/transcriptions`            | Create `{ text, title?, language?, duration_seconds? }` |
| PUT    | `/api/transcriptions/:id`        | Update `{ text?, title?, language? }`        |
| DELETE | `/api/transcriptions/:id`        | Delete                                       |
| GET    | `/api/health`                    | Health check                                 |

WebSocket `/ws/transcribe`: client sends binary PCM16 16 kHz mono frames and a
`{"type":"stop"}` text frame; server sends `ready`, `transcript`,
`turn_complete`, `error`, `closed`.

## Deploy (Render, free tier)

1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → select the repo (uses `render.yaml`).
3. When asked, set `GEMINI_API_KEY`.
4. Open the generated `https://….onrender.com` URL. HTTPS is required for the
   microphone, and Render provides it.

Free instances sleep when idle, so the first request can take ~30 s.

## Notes

- The model name is configurable via `GEMINI_MODEL`. If Google ships a newer
  Live model, change the env var; no code change needed.
- Language label (Hindi / English / Hindi + English) is derived from the
  scripts present in the transcript.

## Live Demo Image
<img width="1366" height="768" alt="Screenshot (485)" src="https://github.com/user-attachments/assets/2f0f71e6-2910-41bd-b014-21eadec7489b" />
