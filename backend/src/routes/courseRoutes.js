import express from 'express';
import {
  getCourses,
  createCourse,
  enrollCourse,
  unenrollCourse,
  getStats,
} from '../controllers/courseController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCourses);
router.get('/stats', protect, getStats);
router.post('/', protect, authorize('TEACHER', 'ADMIN'), createCourse);
router.post('/:id/enroll', protect, authorize('STUDENT'), enrollCourse);
router.delete('/:id/unenroll', protect, authorize('STUDENT'), unenrollCourse);

export default router;
