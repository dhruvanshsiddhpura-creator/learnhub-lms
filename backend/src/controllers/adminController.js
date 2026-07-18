import prisma from '../db.js';

// @desc    Get platform statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalTeachers = await prisma.user.count({ where: { role: 'TEACHER' } });
    const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });

    const totalClassrooms = await prisma.classroom.count();
    const totalCourses = await prisma.course.count();
    const totalMaterials = await prisma.material.count();
    const totalSubmissions = await prisma.submission.count();

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, students: totalStudents, teachers: totalTeachers, admins: totalAdmins },
        classrooms: totalClassrooms,
        courses: totalCourses,
        materials: totalMaterials,
        submissions: totalSubmissions,
      }
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        googleId: true,
        facebookId: true,
        githubId: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    await prisma.user.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

// @desc    Delete classroom (moderation)
// @route   DELETE /api/admin/classrooms/:id
// @access  Private/Admin
export const deleteClassroomAdmin = async (req, res) => {
  try {
    await prisma.classroom.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Classroom deleted successfully' });
  } catch (error) {
    console.error('Error deleting classroom (admin):', error);
    res.status(500).json({ message: 'Server error deleting classroom' });
  }
};

// @desc    Delete doubt (moderation)
// @route   DELETE /api/admin/doubts/:id
// @access  Private/Admin
export const deleteDoubtAdmin = async (req, res) => {
  try {
    await prisma.doubt.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Doubt deleted successfully' });
  } catch (error) {
    console.error('Error deleting doubt (admin):', error);
    res.status(500).json({ message: 'Server error deleting doubt' });
  }
};

// @desc    Delete reply (moderation)
// @route   DELETE /api/admin/replies/:id
// @access  Private/Admin
export const deleteReplyAdmin = async (req, res) => {
  try {
    await prisma.reply.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Error deleting reply (admin):', error);
    res.status(500).json({ message: 'Server error deleting reply' });
  }
};

// @desc    Create global announcement
// @route   POST /api/admin/announcements
// @access  Private/Admin
export const createAnnouncement = async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        authorId: req.user.id
      },
      include: {
        author: { select: { name: true, avatar: true } }
      }
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Server error creating announcement' });
  }
};

// @desc    Get all announcements
// @route   GET /api/admin/announcements
// @access  Private
export const getAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: {
        author: { select: { name: true, avatar: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Server error fetching announcements' });
  }
};
