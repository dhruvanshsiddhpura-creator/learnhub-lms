import express from 'express';
import {
  createAssignment,
  getAssignments,
  getAssignmentDetails,
  deleteAssignment,
  submitAssignment,
  gradeSubmission
} from '../controllers/assignmentController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { upload } from '../services/uploadService.js';

const router = express.Router({ mergeParams: true });

router.post('/', protect, authorize('TEACHER', 'ADMIN'), upload.single('file'), createAssignment);
router.get('/', protect, getAssignments);

export default router;
