import prisma from '../db.js';

// @desc    Get all courses (with optional filters)
// @route   GET /api/courses
// @access  Private
export const getCourses = async (req, res) => {
  const { enrolled, mine } = req.query;
  const userId = req.user.id;

  try {
    let whereClause = {};

    if (enrolled === 'true') {
      whereClause = {
        enrollments: {
          some: {
            userId: userId,
          },
        },
      };
    } else if (mine === 'true' && req.user.role === 'TEACHER') {
      whereClause = {
        instructorId: userId,
      };
    }

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
        enrollments: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add a flag indicating if the current user is enrolled
    const coursesWithEnrollmentStatus = courses.map((course) => {
      const isEnrolled = course.enrollments.some((e) => e.userId === userId);
      return {
        ...course,
        isEnrolled,
        enrollmentCount: course.enrollments.length,
        enrollments: undefined, // strip from response
      };
    });

    res.json(coursesWithEnrollmentStatus);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Error fetching courses' });
  }
};

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (TEACHER, ADMIN)
export const createCourse = async (req, res) => {
  const { title, description, category, banner } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: 'Please provide course title and description' });
  }

  try {
    const course = await prisma.course.create({
      data: {
        title,
        description,
        category: category || 'General',
        banner: banner || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60`,
        instructorId: req.user.id,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Error creating course' });
  }
};

// @desc    Enroll in a course
// @route   POST /api/courses/:id/enroll
// @access  Private (STUDENT)
export const enrollCourse = async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.id;

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    await prisma.enrollment.create({
      data: {
        userId,
        courseId,
      },
    });

    res.json({ message: 'Successfully enrolled in course' });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ message: 'Error enrolling in course' });
  }
};

// @desc    Unenroll from a course
// @route   DELETE /api/courses/:id/unenroll
// @access  Private (STUDENT)
export const unenrollCourse = async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.id;

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return res.status(400).json({ message: 'You are not enrolled in this course' });
    }

    await prisma.enrollment.delete({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    res.json({ message: 'Successfully unenrolled from course' });
  } catch (error) {
    console.error('Unenrollment error:', error);
    res.status(500).json({ message: 'Error unenrolling from course' });
  }
};

// @desc    Get stats for dashboard
// @route   GET /api/courses/stats
// @access  Private
export const getStats = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    if (role === 'STUDENT') {
      const enrollmentsCount = await prisma.enrollment.count({
        where: { userId },
      });

      // Get count of categories
      const enrolledCourses = await prisma.course.findMany({
        where: {
          enrollments: {
            some: { userId },
          },
        },
        select: {
          category: true,
        },
      });

      const uniqueCategories = new Set(enrolledCourses.map((c) => c.category)).size;

      const videoProgresses = await prisma.videoProgress.findMany({
        where: { studentId: userId },
      });
      const totalSeconds = videoProgresses.reduce((acc, vp) => acc + (vp.progressSeconds || 0), 0);
      const studyHours = Math.round(totalSeconds / 3600) || 0;

      res.json({
        enrolledCount: enrollmentsCount,
        categoryCount: uniqueCategories,
        studyHours: studyHours,
        completedCount: Math.round(enrollmentsCount * 0.4), // Keep mock for now since full course completion tracking isn't clear
      });
    } else if (role === 'TEACHER') {
      const coursesCount = await prisma.course.count({
        where: { instructorId: userId },
      });

      const coursesTaught = await prisma.course.findMany({
        where: { instructorId: userId },
        include: {
          enrollments: true,
        },
      });

      const totalStudents = coursesTaught.reduce((acc, course) => acc + course.enrollments.length, 0);

      res.json({
        coursesCount,
        studentCount: totalStudents,
        rating: 4.8, // Mock metric
        teachingHours: coursesCount * 12, // Mock metric
      });
    } else if (role === 'ADMIN') {
      const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
      const totalTeachers = await prisma.user.count({ where: { role: 'TEACHER' } });
      const totalCourses = await prisma.course.count();

      res.json({
        studentCount: totalStudents,
        teacherCount: totalTeachers,
        courseCount: totalCourses,
        activeSessions: 142, // Mock metric
      });
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};
