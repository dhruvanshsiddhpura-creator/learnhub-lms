import express from 'express';
import {
  createQuiz,
  getQuizzes,
  getQuizDetails,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  startQuiz,
  submitQuiz,
  getQuizResults
} from '../controllers/quizController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Quiz CRUD
router.route('/')
  .post(protect, authorize('TEACHER', 'ADMIN'), createQuiz)
  .get(protect, getQuizzes);

router.route('/:quizId')
  .get(protect, getQuizDetails)
  .put(protect, authorize('TEACHER', 'ADMIN'), updateQuiz)
  .delete(protect, authorize('TEACHER', 'ADMIN'), deleteQuiz);

// Question CRUD
router.post('/:quizId/questions', protect, authorize('TEACHER', 'ADMIN'), addQuestion);
router.put('/:quizId/questions/:questionId', protect, authorize('TEACHER', 'ADMIN'), updateQuestion);
router.delete('/:quizId/questions/:questionId', protect, authorize('TEACHER', 'ADMIN'), deleteQuestion);

// Student attempt routes
router.post('/:quizId/start', protect, authorize('STUDENT'), startQuiz);
router.post('/:quizId/submit', protect, authorize('STUDENT'), submitQuiz);
router.get('/:quizId/results', protect, getQuizResults);

export default router;
