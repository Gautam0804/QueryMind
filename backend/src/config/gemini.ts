
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    'Missing required environment variable: GEMINI_API_KEY',
  );
}

export const gemini = new GoogleGenAI({
  apiKey,
  httpOptions: {
    timeout: 30_000,
  },
});

export const CHAT_MODEL =
  process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

export const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001';

export const EMBEDDING_DIMENSIONS = Number(
  process.env.GEMINI_EMBEDDING_DIMENSIONS ?? 384,
);

if (EMBEDDING_DIMENSIONS !== 384) {
  throw new Error(
    'EMBEDDING_DIMENSIONS must be 384 for the current pgvector column.',
  );
}
