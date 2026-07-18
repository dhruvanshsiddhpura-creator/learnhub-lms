import prisma from '../db.js';

// @desc    Get dashboard analytics
// @route   GET /api/analytics
// @access  Private
export const getAnalytics = async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    if (role === 'TEACHER' || role === 'ADMIN') {
      // Teacher Analytics
      const myClassrooms = await prisma.classroom.findMany({
        where: { teacherId: userId },
        include: {
          enrollments: true,
          assignments: {
            include: { submissions: true }
          },
          quizzes: {
            include: { attempts: true }
          }
        }
      });

      // Compile stats
      const totalStudents = myClassrooms.reduce((acc, c) => acc + c.enrollments.length, 0);
      
      let totalAssignments = 0;
      let totalSubmissions = 0;
      myClassrooms.forEach(c => {
        c.assignments.forEach(a => {
          totalAssignments += c.enrollments.length; // Expected submissions
          totalSubmissions += a.submissions.length;
        });
      });
      const assignmentCompletionRate = totalAssignments === 0 ? 0 : Math.round((totalSubmissions / totalAssignments) * 100);

      let totalQuizScore = 0;
      let totalQuizAttempts = 0;
      myClassrooms.forEach(c => {
        c.quizzes.forEach(q => {
          q.attempts.forEach(attempt => {
            if (attempt.score !== null) {
              totalQuizScore += attempt.score;
              totalQuizAttempts++;
            }
          });
        });
      });
      const averageQuizScore = totalQuizAttempts === 0 ? 0 : Math.round(totalQuizScore / totalQuizAttempts);

      res.json({
        success: true,
        data: {
          totalStudents,
          assignmentCompletionRate,
          averageQuizScore,
          totalClassrooms: myClassrooms.length,
          chartData: [ // Mock trend for now
            { name: 'Mon', active: Math.floor(Math.random() * totalStudents) },
            { name: 'Tue', active: Math.floor(Math.random() * totalStudents) },
            { name: 'Wed', active: Math.floor(Math.random() * totalStudents) },
            { name: 'Thu', active: Math.floor(Math.random() * totalStudents) },
            { name: 'Fri', active: Math.floor(Math.random() * totalStudents) },
          ]
        }
      });
    } else {
      // Student Analytics
      const enrollments = await prisma.classroomEnrollment.findMany({
        where: { studentId: userId },
        include: {
          classroom: {
            include: { assignments: true, quizzes: true }
          }
        }
      });

      const submissions = await prisma.submission.findMany({
        where: { studentId: userId }
      });

      const attempts = await prisma.quizAttempt.findMany({
        where: { studentId: userId }
      });

      let totalAssignments = 0;
      enrollments.forEach(e => {
        totalAssignments += e.classroom.assignments.length;
      });
      
      const completedAssignments = submissions.length;
      const progress = totalAssignments === 0 ? 100 : Math.round((completedAssignments / totalAssignments) * 100);
      const pendingAssignments = totalAssignments - completedAssignments;

      const attendanceRecords = await prisma.attendance.findMany({
        where: { studentId: userId }
      });
      let attendancePercentage = 100;
      if (attendanceRecords.length > 0) {
        const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length;
        attendancePercentage = Math.round((presentCount / attendanceRecords.length) * 100);
      }
      res.json({
        success: true,
        data: {
          progress,
          pendingAssignments,
          attendancePercentage,
          completedQuizzes: attempts.length,
          chartData: [ // Mock activity trend for now
            { name: 'Mon', score: Math.floor(Math.random() * 100) },
            { name: 'Tue', score: Math.floor(Math.random() * 100) },
            { name: 'Wed', score: Math.floor(Math.random() * 100) },
            { name: 'Thu', score: Math.floor(Math.random() * 100) },
            { name: 'Fri', score: Math.floor(Math.random() * 100) },
          ]
        }
      });
    }

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
};
