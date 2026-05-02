import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import chatRouter from './routes/chat.js';
import { ValidationError, OpenAIError } from './errors.js';

const app = express();

app.use(cors({
  origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.use('/api', chatRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
  } else if (err instanceof OpenAIError) {
    res.status(err.statusCode).json({ error: err.userMessage, code: err.code });
  } else {
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

export default app;
