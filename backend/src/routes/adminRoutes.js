import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  getPlatformStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  deleteClassroomAdmin,
  deleteDoubtAdmin,
  deleteReplyAdmin,
  createAnnouncement,
  getAnnouncements
} from '../controllers/adminController.js';

const router = express.Router();

// Publicly available (but still protected) announcements
router.get('/announcements', protect, getAnnouncements);

// All other routes require ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/stats', getPlatformStats);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Moderation
router.delete('/classrooms/:id', deleteClassroomAdmin);
router.delete('/doubts/:id', deleteDoubtAdmin);
router.delete('/replies/:id', deleteReplyAdmin);

// Announcements
router.post('/announcements', createAnnouncement);

export default router;
