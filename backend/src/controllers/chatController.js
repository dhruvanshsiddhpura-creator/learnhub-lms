import prisma from '../db.js';
import { sendSocketEvent, sendChatRoomEvent } from '../socket/socketHandler.js';

// @desc    Send a direct message
// @route   POST /api/classrooms/:classroomId/chats/:studentId/messages
// @access  Private (Student/Teacher)
export const sendMessage = async (req, res) => {
  const { classroomId, studentId } = req.params;
  const { content } = req.body;
  const senderId = req.user.id;
  const file = req.file;

  try {
    // Validate classroom exists and find teacher
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        enrollments: true,
      },
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Authorization checks
    const isTeacher = req.user.role === 'TEACHER' && classroom.teacherId === senderId;
    const isStudent = req.user.role === 'STUDENT' && senderId === studentId && classroom.enrollments.some(e => e.studentId === studentId);
    
    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: 'Not authorized to send messages in this conversation' });
    }

    // Determine receiver
    const receiverId = isTeacher ? studentId : classroom.teacherId;

    let fileUrl = null;
    let fileType = null;
    
    if (file) {
      fileUrl = file.path; // Set by multer-storage-cloudinary or local upload
      fileType = file.mimetype.startsWith('image/') ? 'IMAGE' : 'FILE';
    }

    if (!content && !fileUrl) {
      return res.status(400).json({ message: 'Message content or file is required' });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content: content || '',
        fileUrl,
        fileType,
        senderId,
        receiverId,
        classroomId,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true }
        }
      }
    });

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      // Emit to the specific chat room
      sendChatRoomEvent(io, classroomId, studentId, 'new_message', message);
      
      // Also send personal notification events to update unread badges
      sendSocketEvent(io, receiverId, 'notification', {
        type: 'NEW_MESSAGE',
        message: 'You have a new message',
        classroomId,
        studentId
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
};

// @desc    Get conversation history (and mark unread as seen)
// @route   GET /api/classrooms/:classroomId/chats/:studentId/messages
// @access  Private (Student/Teacher)
export const getConversation = async (req, res) => {
  const { classroomId, studentId } = req.params;
  const userId = req.user.id;

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Authorization checks
    const isTeacher = req.user.role === 'TEACHER' && classroom.teacherId === userId;
    const isStudent = req.user.role === 'STUDENT' && userId === studentId;
    
    if (!isTeacher && !isStudent && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: {
        classroomId,
        OR: [
          { senderId: studentId, receiverId: classroom.teacherId },
          { senderId: classroom.teacherId, receiverId: studentId }
        ]
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark as seen for messages where current user is receiver
    const unreadMessageIds = messages
      .filter(m => m.receiverId === userId && !m.isSeen)
      .map(m => m.id);

    if (unreadMessageIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadMessageIds } },
        data: { isSeen: true }
      });

      // Emit event to inform sender that messages have been seen
      const io = req.app.get('io');
      if (io) {
        sendChatRoomEvent(io, classroomId, studentId, 'messages_seen', {
          viewerId: userId
        });
      }
    }

    // Attach seen status correctly in memory for the response
    const formattedMessages = messages.map(m => {
      if (unreadMessageIds.includes(m.id)) {
        m.isSeen = true;
      }
      return m;
    });

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Error fetching conversation' });
  }
};

// @desc    Get chat roster (for teachers: list students with unread; for students: get teacher)
// @route   GET /api/classrooms/:classroomId/chats
// @access  Private
export const getChatRoster = async (req, res) => {
  const { classroomId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        teacher: { select: { id: true, name: true, avatar: true } },
        enrollments: {
          include: { student: { select: { id: true, name: true, avatar: true } } }
        }
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Teacher View: Roster of all enrolled students + unread message counts
    if (role === 'TEACHER' && classroom.teacherId === userId) {
      const roster = await Promise.all(classroom.enrollments.map(async (e) => {
        const student = e.student;
        // Get last message
        const lastMessage = await prisma.message.findFirst({
          where: {
            classroomId,
            OR: [
              { senderId: student.id, receiverId: classroom.teacherId },
              { senderId: classroom.teacherId, receiverId: student.id }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        // Get unread count
        const unreadCount = await prisma.message.count({
          where: {
            classroomId,
            senderId: student.id,
            receiverId: classroom.teacherId,
            isSeen: false
          }
        });

        return {
          student,
          lastMessage,
          unreadCount
        };
      }));

      // Sort roster: latest messages first
      roster.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      });

      return res.json({ roster });
    }

    // Student View: Teacher profile + unread message count
    if (role === 'STUDENT') {
      const isEnrolled = classroom.enrollments.some(e => e.studentId === userId);
      if (!isEnrolled) {
        return res.status(403).json({ message: 'You are not enrolled in this classroom' });
      }

      const unreadCount = await prisma.message.count({
        where: {
          classroomId,
          senderId: classroom.teacherId,
          receiverId: userId,
          isSeen: false
        }
      });

      return res.json({ 
        teacher: classroom.teacher,
        unreadCount
      });
    }

    return res.status(403).json({ message: 'Not authorized' });
  } catch (error) {
    console.error('Error fetching chat roster:', error);
    res.status(500).json({ message: 'Error fetching chat roster' });
  }
};
