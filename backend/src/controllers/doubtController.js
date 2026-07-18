import prisma from '../db.js';
import { sendSocketEvent } from '../socket/socketHandler.js';

// @desc    Create a doubt
// @route   POST /api/classrooms/:classroomId/doubts
// @access  Private (STUDENT)
export const createDoubt = async (req, res) => {
  const { classroomId } = req.params;
  const { title, content } = req.body;
  const studentId = req.user.id;

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: { enrollments: true }
    });

    if (!classroom || !classroom.enrollments.some(e => e.studentId === studentId)) {
      return res.status(403).json({ message: 'Not enrolled in this classroom' });
    }

    const doubt = await prisma.doubt.create({
      data: {
        title,
        content,
        classroomId,
        studentId
      },
      include: {
        student: { select: { id: true, name: true, avatar: true } }
      }
    });

    // Notify teacher
    const io = req.app.get('io');
    if (io) {
      sendSocketEvent(io, classroom.teacherId, 'notification', {
        type: 'NEW_DOUBT',
        message: `New doubt posted: ${title}`,
        classroomId,
        doubtId: doubt.id
      });
    }

    res.status(201).json(doubt);
  } catch (error) {
    console.error('Error creating doubt:', error);
    res.status(500).json({ message: 'Error creating doubt' });
  }
};

// @desc    Get all doubts for a classroom
// @route   GET /api/classrooms/:classroomId/doubts
// @access  Private
export const getDoubts = async (req, res) => {
  const { classroomId } = req.params;
  const { search, resolved } = req.query;

  let whereClause = { classroomId };

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (resolved !== undefined) {
    whereClause.isResolved = resolved === 'true';
  }

  try {
    const doubts = await prisma.doubt.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, name: true, avatar: true } },
        _count: { select: { replies: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(doubts);
  } catch (error) {
    console.error('Error fetching doubts:', error);
    res.status(500).json({ message: 'Error fetching doubts' });
  }
};

// @desc    Get doubt details including replies and upvotes
// @route   GET /api/classrooms/:classroomId/doubts/:doubtId
// @access  Private
export const getDoubtDetails = async (req, res) => {
  const { doubtId } = req.params;
  const userId = req.user.id;

  try {
    const doubt = await prisma.doubt.findUnique({
      where: { id: doubtId },
      include: {
        student: { select: { id: true, name: true, avatar: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, avatar: true, role: true } },
            upvotes: { select: { userId: true } },
            _count: { select: { upvotes: true } }
          },
          orderBy: [
            { isTeacherReply: 'desc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    // Format replies to easily identify if current user upvoted
    const formattedReplies = doubt.replies.map(reply => ({
      ...reply,
      hasUpvoted: reply.upvotes.some(upvote => upvote.userId === userId),
      upvotes: undefined // hide raw upvotes array to save bandwidth
    }));

    res.json({ ...doubt, replies: formattedReplies });
  } catch (error) {
    console.error('Error fetching doubt details:', error);
    res.status(500).json({ message: 'Error fetching doubt details' });
  }
};

// @desc    Reply to a doubt
// @route   POST /api/classrooms/:classroomId/doubts/:doubtId/replies
// @access  Private
export const replyToDoubt = async (req, res) => {
  const { doubtId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const doubt = await prisma.doubt.findUnique({
      where: { id: doubtId }
    });

    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    const isTeacherReply = role === 'TEACHER' || role === 'ADMIN';

    const reply = await prisma.reply.create({
      data: {
        content,
        doubtId,
        authorId: userId,
        isTeacherReply
      },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
        _count: { select: { upvotes: true } }
      }
    });

    // Notify doubt author if someone else replies
    if (doubt.studentId !== userId) {
      const io = req.app.get('io');
      if (io) {
        sendSocketEvent(io, doubt.studentId, 'notification', {
          type: 'NEW_REPLY',
          message: 'Someone replied to your doubt',
          classroomId: doubt.classroomId,
          doubtId: doubt.id
        });
      }
    }

    res.status(201).json({ ...reply, hasUpvoted: false });
  } catch (error) {
    console.error('Error replying to doubt:', error);
    res.status(500).json({ message: 'Error replying to doubt' });
  }
};

// @desc    Toggle resolved status
// @route   PUT /api/classrooms/:classroomId/doubts/:doubtId/resolve
// @access  Private (Doubt Author or Teacher)
export const resolveDoubt = async (req, res) => {
  const { classroomId, doubtId } = req.params;
  const userId = req.user.id;

  try {
    const doubt = await prisma.doubt.findUnique({
      where: { id: doubtId },
      include: { classroom: true }
    });

    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    const isAuthor = doubt.studentId === userId;
    const isTeacher = doubt.classroom.teacherId === userId;

    if (!isAuthor && !isTeacher && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to resolve this doubt' });
    }

    const updatedDoubt = await prisma.doubt.update({
      where: { id: doubtId },
      data: { isResolved: !doubt.isResolved }
    });

    res.json(updatedDoubt);
  } catch (error) {
    console.error('Error resolving doubt:', error);
    res.status(500).json({ message: 'Error resolving doubt' });
  }
};

// @desc    Toggle upvote on a reply
// @route   POST /api/classrooms/:classroomId/replies/:replyId/upvote
// @access  Private
export const toggleUpvote = async (req, res) => {
  const { replyId } = req.params;
  const userId = req.user.id;

  try {
    const existingUpvote = await prisma.replyUpvote.findUnique({
      where: {
        userId_replyId: {
          userId,
          replyId
        }
      }
    });

    if (existingUpvote) {
      // Remove upvote
      await prisma.replyUpvote.delete({
        where: { id: existingUpvote.id }
      });
      res.json({ message: 'Upvote removed', hasUpvoted: false });
    } else {
      // Add upvote
      await prisma.replyUpvote.create({
        data: {
          userId,
          replyId
        }
      });
      res.json({ message: 'Upvote added', hasUpvoted: true });
    }
  } catch (error) {
    console.error('Error toggling upvote:', error);
    res.status(500).json({ message: 'Error toggling upvote' });
  }
};
