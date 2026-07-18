import prisma from '../db.js';

// Helper to generate a unique 6-character classroom code
const generateClassroomCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Check if code already exists in DB
    const existing = await prisma.classroom.findUnique({
      where: { code },
    });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

// @desc    Get classrooms (filters based on role)
// @route   GET /api/classrooms
// @access  Private
export const getClassrooms = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    let classrooms = [];

    if (role === 'TEACHER') {
      classrooms = await prisma.classroom.findMany({
        where: { teacherId: userId },
        include: {
          enrollments: {
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'STUDENT') {
      classrooms = await prisma.classroom.findMany({
        where: {
          enrollments: {
            some: { studentId: userId },
          },
        },
        include: {
          teacher: {
            select: { id: true, name: true, avatar: true },
          },
          enrollments: {
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'ADMIN') {
      classrooms = await prisma.classroom.findMany({
        include: {
          teacher: {
            select: { id: true, name: true },
          },
          enrollments: {
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Map to include student counts cleanly
    const formatted = classrooms.map((cls) => ({
      ...cls,
      studentCount: cls.enrollments.length,
      enrollments: undefined,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    res.status(500).json({ message: 'Error fetching classrooms' });
  }
};

// @desc    Get classroom details and enrolled student profiles
// @route   GET /api/classrooms/:id
// @access  Private
export const getClassroomDetails = async (req, res) => {
  const classroomId = req.params.id;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        teacher: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        enrollments: {
          include: {
            student: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Authorization checks:
    // Teachers must own this class, Students must be enrolled in it, Admins can do anything
    if (role === 'TEACHER' && classroom.teacherId !== userId) {
      return res.status(403).json({ message: 'Not authorized to view this classroom' });
    }

    if (role === 'STUDENT') {
      const isEnrolled = classroom.enrollments.some((e) => e.studentId === userId);
      if (!isEnrolled) {
        return res.status(403).json({ message: 'You are not enrolled in this classroom' });
      }
    }

    // Format output
    const enrolledStudents = classroom.enrollments.map((e) => e.student);
    
    res.json({
      id: classroom.id,
      name: classroom.name,
      description: classroom.description,
      code: classroom.code,
      teacher: classroom.teacher,
      teacherId: classroom.teacherId,
      students: enrolledStudents,
      studentCount: enrolledStudents.length,
      createdAt: classroom.createdAt,
    });
  } catch (error) {
    console.error('Error fetching classroom details:', error);
    res.status(500).json({ message: 'Error fetching classroom details' });
  }
};

// @desc    Create a new classroom
// @route   POST /api/classrooms
// @access  Private (TEACHER, ADMIN)
export const createClassroom = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({ message: 'Please provide classroom name and description' });
  }

  try {
    const code = await generateClassroomCode();

    const classroom = await prisma.classroom.create({
      data: {
        name,
        description,
        code,
        teacherId: req.user.id,
      },
    });

    res.status(201).json(classroom);
  } catch (error) {
    console.error('Error creating classroom:', error);
    res.status(500).json({ message: 'Error creating classroom' });
  }
};

// @desc    Edit classroom details
// @route   PUT /api/classrooms/:id
// @access  Private (TEACHER, ADMIN)
export const updateClassroom = async (req, res) => {
  const classroomId = req.params.id;
  const { name, description } = req.body;

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Auth validation
    if (req.user.role === 'TEACHER' && classroom.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to manage this classroom' });
    }

    const updatedClassroom = await prisma.classroom.update({
      where: { id: classroomId },
      data: {
        name: name || classroom.name,
        description: description || classroom.description,
      },
    });

    res.json(updatedClassroom);
  } catch (error) {
    console.error('Error updating classroom:', error);
    res.status(500).json({ message: 'Error updating classroom' });
  }
};

// @desc    Delete a classroom
// @route   DELETE /api/classrooms/:id
// @access  Private (TEACHER, ADMIN)
export const deleteClassroom = async (req, res) => {
  const classroomId = req.params.id;

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Auth validation
    if (req.user.role === 'TEACHER' && classroom.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this classroom' });
    }

    await prisma.classroom.delete({
      where: { id: classroomId },
    });

    res.json({ message: 'Classroom successfully deleted' });
  } catch (error) {
    console.error('Error deleting classroom:', error);
    res.status(500).json({ message: 'Error deleting classroom' });
  }
};

// @desc    Join classroom using unique code
// @route   POST /api/classrooms/join
// @access  Private (STUDENT)
export const joinClassroom = async (req, res) => {
  const { code } = req.body;
  const studentId = req.user.id;

  if (!code) {
    return res.status(400).json({ message: 'Classroom code is required' });
  }

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!classroom) {
      return res.status(404).json({ message: 'No classroom found with this code' });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.classroomEnrollment.findUnique({
      where: {
        studentId_classroomId: {
          studentId,
          classroomId: classroom.id,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'You are already joined to this classroom' });
    }

    // Enroll student
    await prisma.classroomEnrollment.create({
      data: {
        studentId,
        classroomId: classroom.id,
      },
    });

    res.json({ message: 'Successfully joined classroom', classroom });
  } catch (error) {
    console.error('Error joining classroom:', error);
    res.status(500).json({ message: 'Error joining classroom' });
  }
};

// @desc    Leave classroom
// @route   DELETE /api/classrooms/:id/leave
// @access  Private (STUDENT)
export const leaveClassroom = async (req, res) => {
  const classroomId = req.params.id;
  const studentId = req.user.id;

  try {
    const enrollment = await prisma.classroomEnrollment.findUnique({
      where: {
        studentId_classroomId: {
          studentId,
          classroomId,
        },
      },
    });

    if (!enrollment) {
      return res.status(400).json({ message: 'You are not enrolled in this classroom' });
    }

    await prisma.classroomEnrollment.delete({
      where: {
        studentId_classroomId: {
          studentId,
          classroomId,
        },
      },
    });

    res.json({ message: 'Successfully left the classroom' });
  } catch (error) {
    console.error('Error leaving classroom:', error);
    res.status(500).json({ message: 'Error leaving classroom' });
  }
};
