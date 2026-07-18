import './config/env.js';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import path from 'path';
import passport from './config/passport.js';
import prisma from './db.js';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import doubtRoutes from './routes/doubtRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { deleteMaterial } from './controllers/materialController.js';
import { deleteVideo, saveVideoProgress, getVideoProgress } from './controllers/videoController.js';
import { getAssignmentDetails, deleteAssignment, submitAssignment, gradeSubmission } from './controllers/assignmentController.js';
import { protect, authorize } from './middlewares/authMiddleware.js';
import { upload } from './services/uploadService.js';
import { initSocket } from './socket/socketHandler.js';


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Initialize socket
initSocket(io);

// Make io accessible in controllers
app.set('io', io);

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Serve static file uploads fallback directory
app.use('/uploads', express.static(path.resolve('uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/classrooms/:classroomId/materials', materialRoutes);
app.use('/api/classrooms/:classroomId/videos', videoRoutes);
app.use('/api/classrooms/:classroomId/assignments', assignmentRoutes);
app.use('/api/classrooms/:classroomId/chats', chatRoutes);
app.use('/api/classrooms/:classroomId/doubts', doubtRoutes);
app.use('/api/classrooms/:classroomId/quizzes', quizRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root material/video delete & progress endpoints
app.delete('/api/materials/:id', protect, authorize('TEACHER', 'ADMIN'), deleteMaterial);
app.delete('/api/videos/:id', protect, authorize('TEACHER', 'ADMIN'), deleteVideo);
app.post('/api/videos/:id/progress', protect, authorize('STUDENT'), saveVideoProgress);
app.get('/api/videos/:id/progress', protect, authorize('STUDENT'), getVideoProgress);

// Root assignment & grading endpoints
app.get('/api/assignments/:id', protect, getAssignmentDetails);
app.delete('/api/assignments/:id', protect, authorize('TEACHER', 'ADMIN'), deleteAssignment);
app.post('/api/assignments/:id/submit', protect, authorize('STUDENT'), upload.single('file'), submitAssignment);
app.post('/api/submissions/:submissionId/grade', protect, authorize('TEACHER', 'ADMIN'), gradeSubmission);

// Simple Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server!' });
});

const PORT = process.env.PORT || 5000;

// Autoseeding mock data for demo
const seedMockData = async () => {
  try {
    const courseCount = await prisma.course.count();
    if (courseCount === 0) {
      console.log('No courses found. Seeding initial data...');

      // Check if default teacher exists
      let teacher = await prisma.user.findUnique({
        where: { email: 'teacher@lms.com' },
      });

      if (!teacher) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        teacher = await prisma.user.create({
          data: {
            name: 'Prof. Sarah Jenkins',
            email: 'teacher@lms.com',
            password: hashedPassword,
            role: 'TEACHER',
            avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SarahJenkins',
          },
        });
        console.log('Created default teacher account (teacher@lms.com / password123)');
      }

      // Check if default admin exists
      let admin = await prisma.user.findUnique({
        where: { email: 'admin@lms.com' },
      });

      if (!admin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        admin = await prisma.user.create({
          data: {
            name: 'System Admin',
            email: 'admin@lms.com',
            password: hashedPassword,
            role: 'ADMIN',
            avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SystemAdmin',
          },
        });
        console.log('Created default admin account (admin@lms.com / password123)');
      }

      // Seed 3 courses
      await prisma.course.createMany({
        data: [
          {
            title: 'Full-Stack Web Development Boot Camp',
            description: 'Learn the MERN stack, database design, REST APIs, and hosting. Build responsive, production-ready web applications from scratch.',
            category: 'Development',
            banner: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60',
            instructorId: teacher.id,
          },
          {
            title: 'Introduction to PostgreSQL & Database Design',
            description: 'Master relational database theory, tables, indexes, transactions, optimization, and write complex queries with confidence.',
            category: 'Databases',
            banner: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&auto=format&fit=crop&q=60',
            instructorId: teacher.id,
          },
          {
            title: 'Modern UI/UX Design & Figma Mastery',
            description: 'Explore the principles of visual design, color palettes, spacing, and micro-interactions. Create high-fidelity visual mockups in Figma.',
            category: 'Design',
            banner: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800&auto=format&fit=crop&q=60',
            instructorId: teacher.id,
          },
        ],
      });

      console.log('Successfully seeded 3 sample courses.');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedMockData();
});
