import prisma from '../db.js';

// ==========================================
// TEACHER: QUIZ MANAGEMENT
// ==========================================

// @desc    Create a quiz (draft)
// @route   POST /api/classrooms/:classroomId/quizzes
// @access  Private (TEACHER)
export const createQuiz = async (req, res) => {
  const { classroomId } = req.params;
  const { title, description, timeLimit, passingScore, shuffleQuestions } = req.body;
  const userId = req.user.id;

  try {
    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
    if (!classroom) return res.status(404).json({ message: 'Classroom not found' });
    if (classroom.teacherId !== userId) return res.status(403).json({ message: 'Only the classroom teacher can create quizzes' });

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        passingScore: passingScore ? parseInt(passingScore) : 50,
        shuffleQuestions: shuffleQuestions || false,
        classroomId,
      },
      include: { _count: { select: { questions: true, attempts: true } } }
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ message: 'Error creating quiz' });
  }
};

// @desc    Get all quizzes for a classroom
// @route   GET /api/classrooms/:classroomId/quizzes
// @access  Private
export const getQuizzes = async (req, res) => {
  const { classroomId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    // For students, only show published quizzes
    const whereClause = role === 'STUDENT' ? { classroomId, isPublished: true } : { classroomId };

    const quizzes = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        _count: { select: { questions: true, attempts: true } },
        attempts: role === 'STUDENT' ? {
          where: { studentId: userId },
          select: { id: true, score: true, isPassed: true, submittedAt: true }
        } : false
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: 'Error fetching quizzes' });
  }
};

// @desc    Get quiz details (with questions) for teacher
// @route   GET /api/classrooms/:classroomId/quizzes/:quizId
// @access  Private
export const getQuizDetails = async (req, res) => {
  const { quizId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' }
        },
        _count: { select: { attempts: true } }
      }
    });

    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // For students: hide correct answers and only show published quizzes
    if (role === 'STUDENT') {
      if (!quiz.isPublished) return res.status(403).json({ message: 'Quiz is not available yet' });

      // Check if student already has an attempt
      const existingAttempt = await prisma.quizAttempt.findUnique({
        where: { studentId_quizId: { studentId: userId, quizId } }
      });

      // Strip correct answers for students who haven't submitted yet
      if (!existingAttempt?.submittedAt) {
        const sanitized = {
          ...quiz,
          questions: quiz.questions.map(q => ({
            ...q,
            explanation: undefined, // hide explanation until submitted
            options: q.options.map(o => ({ ...o, isCorrect: undefined }))
          }))
        };
        return res.json({ quiz: sanitized, attempt: existingAttempt });
      }

      return res.json({ quiz, attempt: existingAttempt });
    }

    res.json({ quiz });
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    res.status(500).json({ message: 'Error fetching quiz details' });
  }
};

// @desc    Update quiz metadata
// @route   PUT /api/classrooms/:classroomId/quizzes/:quizId
// @access  Private (TEACHER)
export const updateQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { title, description, timeLimit, passingScore, shuffleQuestions, isPublished } = req.body;
  const userId = req.user.id;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { classroom: true } });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.classroom.teacherId !== userId) return res.status(403).json({ message: 'Not authorized' });

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(timeLimit !== undefined && { timeLimit: timeLimit ? parseInt(timeLimit) : null }),
        ...(passingScore !== undefined && { passingScore: parseInt(passingScore) }),
        ...(shuffleQuestions !== undefined && { shuffleQuestions }),
        ...(isPublished !== undefined && { isPublished }),
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ message: 'Error updating quiz' });
  }
};

// @desc    Delete a quiz
// @route   DELETE /api/classrooms/:classroomId/quizzes/:quizId
// @access  Private (TEACHER)
export const deleteQuiz = async (req, res) => {
  const { quizId } = req.params;
  const userId = req.user.id;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { classroom: true } });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.classroom.teacherId !== userId) return res.status(403).json({ message: 'Not authorized' });

    await prisma.quiz.delete({ where: { id: quizId } });
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ message: 'Error deleting quiz' });
  }
};

// @desc    Add a question to a quiz
// @route   POST /api/classrooms/:classroomId/quizzes/:quizId/questions
// @access  Private (TEACHER)
export const addQuestion = async (req, res) => {
  const { quizId } = req.params;
  const { text, type, marks, explanation, options } = req.body;
  const userId = req.user.id;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { classroom: true } });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.classroom.teacherId !== userId) return res.status(403).json({ message: 'Not authorized' });

    // Get current question count for ordering
    const count = await prisma.question.count({ where: { quizId } });

    const question = await prisma.question.create({
      data: {
        text,
        type: type || 'MCQ',
        marks: marks ? parseInt(marks) : 1,
        explanation,
        order: count,
        quizId,
        options: {
          create: (options || []).map((opt, idx) => ({
            text: opt.text,
            isCorrect: opt.isCorrect || false,
            order: idx
          }))
        }
      },
      include: { options: { orderBy: { order: 'asc' } } }
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ message: 'Error adding question' });
  }
};

// @desc    Update a question
// @route   PUT /api/classrooms/:classroomId/quizzes/:quizId/questions/:questionId
// @access  Private (TEACHER)
export const updateQuestion = async (req, res) => {
  const { quizId, questionId } = req.params;
  const { text, type, marks, explanation, options } = req.body;
  const userId = req.user.id;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { classroom: true } });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.classroom.teacherId !== userId) return res.status(403).json({ message: 'Not authorized' });

    // Delete old options and re-create
    await prisma.option.deleteMany({ where: { questionId } });

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: {
        ...(text !== undefined && { text }),
        ...(type !== undefined && { type }),
        ...(marks !== undefined && { marks: parseInt(marks) }),
        ...(explanation !== undefined && { explanation }),
        options: {
          create: (options || []).map((opt, idx) => ({
            text: opt.text,
            isCorrect: opt.isCorrect || false,
            order: idx
          }))
        }
      },
      include: { options: { orderBy: { order: 'asc' } } }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Error updating question' });
  }
};

// @desc    Delete a question
// @route   DELETE /api/classrooms/:classroomId/quizzes/:quizId/questions/:questionId
// @access  Private (TEACHER)
export const deleteQuestion = async (req, res) => {
  const { quizId, questionId } = req.params;
  const userId = req.user.id;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { classroom: true } });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.classroom.teacherId !== userId) return res.status(403).json({ message: 'Not authorized' });

    await prisma.question.delete({ where: { id: questionId } });
    res.json({ message: 'Question deleted' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};

// ==========================================
// STUDENT: QUIZ ATTEMPTS
// ==========================================

// @desc    Start a quiz attempt
// @route   POST /api/classrooms/:classroomId/quizzes/:quizId/start
// @access  Private (STUDENT)
export const startQuiz = async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user.id;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || !quiz.isPublished) return res.status(404).json({ message: 'Quiz not available' });

    // Check if already attempted
    const existingAttempt = await prisma.quizAttempt.findUnique({
      where: { studentId_quizId: { studentId, quizId } }
    });

    if (existingAttempt) {
      return res.status(400).json({ message: 'You have already attempted this quiz', attempt: existingAttempt });
    }

    const attempt = await prisma.quizAttempt.create({
      data: { studentId, quizId }
    });

    res.status(201).json(attempt);
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ message: 'Error starting quiz' });
  }
};

// @desc    Submit quiz answers and auto-grade
// @route   POST /api/classrooms/:classroomId/quizzes/:quizId/submit
// @access  Private (STUDENT)
export const submitQuiz = async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user.id;
  const { answers, timeTaken } = req.body;
  // answers = [{ questionId, selectedOptionIds: [], textAnswer: '' }]

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true }
        }
      }
    });

    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const attempt = await prisma.quizAttempt.findUnique({
      where: { studentId_quizId: { studentId, quizId } }
    });

    if (!attempt) return res.status(400).json({ message: 'No active attempt found. Please start the quiz first.' });
    if (attempt.submittedAt) return res.status(400).json({ message: 'Quiz already submitted' });

    // Grade each answer
    let totalMarksObtained = 0;
    const maxMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

    const answerData = [];
    for (const ans of answers) {
      const question = quiz.questions.find(q => q.id === ans.questionId);
      if (!question) continue;

      let isCorrect = false;
      let marksEarned = 0;

      if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
        const correctOption = question.options.find(o => o.isCorrect);
        isCorrect = correctOption && ans.selectedOptionIds?.includes(correctOption.id);
        marksEarned = isCorrect ? question.marks : 0;
      } else if (question.type === 'MSQ') {
        const correctIds = question.options.filter(o => o.isCorrect).map(o => o.id);
        const selectedIds = ans.selectedOptionIds || [];
        const allCorrect = correctIds.every(id => selectedIds.includes(id));
        const noWrong = selectedIds.every(id => correctIds.includes(id));
        isCorrect = allCorrect && noWrong;
        marksEarned = isCorrect ? question.marks : 0;
      } else if (question.type === 'SHORT_ANSWER') {
        // SHORT_ANSWER: marked as null/pending for now; teacher can review
        isCorrect = null;
        marksEarned = 0;
      }

      totalMarksObtained += marksEarned;
      answerData.push({
        attemptId: attempt.id,
        questionId: ans.questionId,
        textAnswer: ans.textAnswer || null,
        isCorrect,
        marksEarned,
        selectedOptionIds: ans.selectedOptionIds || []
      });
    }

    const scorePercent = maxMarks > 0 ? Math.round((totalMarksObtained / maxMarks) * 100) : 0;
    const isPassed = scorePercent >= quiz.passingScore;

    // Save answers in DB using transactions
    await prisma.$transaction(async (tx) => {
      for (const ans of answerData) {
        const { selectedOptionIds, ...ansFields } = ans;
        await tx.quizAnswer.create({
          data: {
            ...ansFields,
            selectedOptions: {
              connect: selectedOptionIds.map(id => ({ id }))
            }
          }
        });
      }

      await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          score: scorePercent,
          totalMarks: totalMarksObtained,
          maxMarks,
          isPassed,
          submittedAt: new Date(),
          timeTaken: timeTaken || null
        }
      });
    });

    res.json({
      message: 'Quiz submitted successfully!',
      score: scorePercent,
      totalMarks: totalMarksObtained,
      maxMarks,
      isPassed,
      passingScore: quiz.passingScore
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Error submitting quiz' });
  }
};

// @desc    Get quiz result for student or all results for teacher
// @route   GET /api/classrooms/:classroomId/quizzes/:quizId/results
// @access  Private
export const getQuizResults = async (req, res) => {
  const { quizId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    if (role === 'STUDENT') {
      const attempt = await prisma.quizAttempt.findUnique({
        where: { studentId_quizId: { studentId: userId, quizId } },
        include: {
          answers: {
            include: {
              question: {
                include: { options: true }
              },
              selectedOptions: true
            }
          }
        }
      });

      if (!attempt) return res.status(404).json({ message: 'No attempt found' });
      return res.json(attempt);
    }

    // Teacher: all attempts
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        student: { select: { id: true, name: true, avatar: true, email: true } },
        _count: { select: { answers: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });

    return res.json(attempts);
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ message: 'Error fetching quiz results' });
  }
};
