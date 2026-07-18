import express from 'express';
import {
  uploadVideo,
  getVideos,
  deleteVideo,
  saveVideoProgress,
  getVideoProgress,
} from '../controllers/videoController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { upload } from '../services/uploadService.js';

const router = express.Router({ mergeParams: true });

// Videos are uploaded under a classroom scope
router.post('/', protect, authorize('TEACHER', 'ADMIN'), upload.single('file'), uploadVideo);
router.get('/', protect, getVideos);

export default router;
