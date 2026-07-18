import express from 'express';
import {
  getClassrooms,
  getClassroomDetails,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  joinClassroom,
  leaveClassroom,
} from '../controllers/classroomController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getClassrooms);
router.get('/:id', protect, getClassroomDetails);

// Teachers/Admins management routes
router.post('/', protect, authorize('TEACHER', 'ADMIN'), createClassroom);
router.put('/:id', protect, authorize('TEACHER', 'ADMIN'), updateClassroom);
router.delete('/:id', protect, authorize('TEACHER', 'ADMIN'), deleteClassroom);

// Students join/leave routes
router.post('/join', protect, authorize('STUDENT'), joinClassroom);
router.delete('/:id/leave', protect, authorize('STUDENT'), leaveClassroom);

export default router;
