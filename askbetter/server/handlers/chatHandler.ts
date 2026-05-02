import { Request, Response, NextFunction } from 'express';
import { validateChatRequest } from '../validation.js';
import { createChatCompletion } from '../services/openaiService.js';
import { logger } from '../utils/logger.js';

export async function chatHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const requestId = crypto.randomUUID();
  logger.info(requestId, 'Chat request received');
  const startTime = Date.now();

  try {
    const { messages } = validateChatRequest(req.body);
    const content = await createChatCompletion(messages);
    const duration = Date.now() - startTime;
    logger.info(requestId, 'Chat request completed', { duration });
    res.json({ message: { role: 'assistant', content } });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logger.error(requestId, 'Chat request failed', {
      duration,
      errorType: (error as { constructor?: { name?: string } })?.constructor?.name,
    });
    next(error);
  }
}
