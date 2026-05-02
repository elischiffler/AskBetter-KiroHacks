import { Router } from 'express';
import { chatHandler } from '../handlers/chatHandler.js';

const router = Router();

router.post('/chat', chatHandler);

export default router;
