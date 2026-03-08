import { Router } from 'express';
import { chatWithAssistant } from '../controllers/bot.controller.js';

const router = Router();

router.post('/chat', chatWithAssistant);

export default router;
