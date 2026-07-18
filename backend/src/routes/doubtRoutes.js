import express from 'express';
import {
  createDoubt,
  getDoubts,
  getDoubtDetails,
  resolveDoubt,
  replyToDoubt,
  toggleUpvote
} from '../controllers/doubtController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Doubt Routes
router.route('/')
  .post(protect, createDoubt)
  .get(protect, getDoubts);

router.route('/:doubtId')
  .get(protect, getDoubtDetails);

router.put('/:doubtId/resolve', protect, resolveDoubt);
router.post('/:doubtId/replies', protect, replyToDoubt);

// Notice: this route maps to /api/classrooms/:classroomId/doubts/:doubtId/replies/:replyId/upvote
// wait, the controller toggleUpvote maps to /api/classrooms/:classroomId/replies/:replyId/upvote
// Let's attach it at the root of doubt routes but under a slightly different path, or just use /replies/:replyId/upvote
// To avoid URL clash, we mount it directly on the router as /replies/:replyId/upvote
// The path relative to index.js is /api/classrooms/:classroomId/doubts
// So /api/classrooms/:classroomId/doubts/replies/:replyId/upvote will work perfectly.
router.post('/replies/:replyId/upvote', protect, toggleUpvote);

export default router;
