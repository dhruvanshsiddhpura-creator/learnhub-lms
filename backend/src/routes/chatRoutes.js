import express from 'express';
import { sendMessage, getConversation, getChatRoster } from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../services/uploadService.js';

const router = express.Router({ mergeParams: true });

// Get chat roster (list of conversations / active users)
router.get('/', protect, getChatRoster);

// Get direct messages with specific student (teacher) or self (student)
router.get('/:studentId/messages', protect, getConversation);

// Send message to specific student (teacher) or self (student)
router.post('/:studentId/messages', protect, upload.single('file'), sendMessage);

export default router;
