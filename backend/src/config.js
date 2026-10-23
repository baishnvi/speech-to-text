import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/speech_to_text',
  pgSsl: process.env.PGSSL === 'true',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel:
    process.env.GEMINI_MODEL || 'gemini-2.5-flash-native-audio-preview-09-2025',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
