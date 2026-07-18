import express from 'express';
import { uploadMaterial, getMaterials, deleteMaterial } from '../controllers/materialController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { upload } from '../services/uploadService.js';

const router = express.Router({ mergeParams: true });

// Materials are uploaded under a classroom scope
router.post('/', protect, authorize('TEACHER', 'ADMIN'), upload.single('file'), uploadMaterial);
router.get('/', protect, getMaterials);

export default router;
