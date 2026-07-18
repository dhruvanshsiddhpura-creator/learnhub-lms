import prisma from '../db.js';
import { uploadFile } from '../services/uploadService.js';
import fs from 'fs';
import path from 'path';

// @desc    Upload video lecture file or add YouTube link
// @route   POST /api/classrooms/:classroomId/videos
// @access  Private (TEACHER, ADMIN)
export const uploadVideo = async (req, res) => {
  const { classroomId } = req.params;
  const { title, description, topic, youtubeUrl } = req.body;
  const file = req.file;

  if (!title) {
    return res.status(400).json({ message: 'Please provide video title' });
  }

  if (!file && !youtubeUrl) {
    return res.status(400).json({ message: 'Please provide either a video file or a YouTube link' });
  }

  try {
    // Verify classroom
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (req.user.role === 'TEACHER' && classroom.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to upload to this classroom' });
    }

    let videoUrl = null;

    if (file) {
      const uploadResult = await uploadFile(file, 'video');
      videoUrl = uploadResult.url;
    }

    const video = await prisma.video.create({
      data: {
        title,
        description: description || '',
        videoUrl,
        youtubeUrl: youtubeUrl || null,
        topic: topic || 'General',
        classroomId,
      },
    });

    res.status(201).json(video);
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ message: 'Error uploading video lecture' });
  }
};

// @desc    Get videos list for classroom
// @route   GET /api/classrooms/:classroomId/videos
// @access  Private
export const getVideos = async (req, res) => {
  const { classroomId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        enrollments: {
          select: { studentId: true }
        }
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Verify user authorization (enrolled student, owner teacher, or admin)
    if (role === 'TEACHER' && classroom.teacherId !== userId) {
      return res.status(403).json({ message: 'Not authorized to access this classroom lectures' });
    }

    if (role === 'STUDENT') {
      const isEnrolled = classroom.enrollments.some((e) => e.studentId === userId);
      if (!isEnrolled) {
        return res.status(403).json({ message: 'You are not enrolled in this classroom' });
      }
    }

    const videos = await prisma.video.findMany({
      where: { classroomId },
      include: {
        progresses: {
          where: { studentId: userId },
          select: { progressSeconds: true, durationSeconds: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format progress mappings
    const formatted = videos.map((vid) => {
      const progress = vid.progresses[0];
      return {
        ...vid,
        progress: progress || null,
        progresses: undefined
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Error fetching videos' });
  }
};

// @desc    Delete video lecture
// @route   DELETE /api/videos/:id
// @access  Private (TEACHER, ADMIN)
export const deleteVideo = async (req, res) => {
  const { id } = req.params;

  try {
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        classroom: true,
      },
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Authorization
    if (req.user.role === 'TEACHER' && video.classroom.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to manage this video' });
    }

    // Cleanup local file if fallback was used
    if (video.videoUrl && video.videoUrl.startsWith('http://localhost:5000/uploads/')) {
      const fileName = video.videoUrl.split('/uploads/')[1];
      const filePath = path.resolve('uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.video.delete({
      where: { id },
    });

    res.json({ message: 'Video lecture successfully deleted' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Error deleting video' });
  }
};

// @desc    Save video playhead position progress
// @route   POST /api/videos/:id/progress
// @access  Private (STUDENT)
export const saveVideoProgress = async (req, res) => {
  const { id } = req.params;
  const { progressSeconds, durationSeconds } = req.body;
  const studentId = req.user.id;

  if (progressSeconds === undefined || durationSeconds === undefined) {
    return res.status(400).json({ message: 'Please provide progressSeconds and durationSeconds' });
  }

  try {
    const progress = await prisma.videoProgress.upsert({
      where: {
        studentId_videoId: {
          studentId,
          videoId: id,
        },
      },
      update: {
        progressSeconds: parseFloat(progressSeconds),
        durationSeconds: parseFloat(durationSeconds),
      },
      create: {
        studentId,
        videoId: id,
        progressSeconds: parseFloat(progressSeconds),
        durationSeconds: parseFloat(durationSeconds),
      },
    });

    res.json(progress);
  } catch (error) {
    console.error('Error saving video progress:', error);
    res.status(500).json({ message: 'Error saving video progress' });
  }
};

// @desc    Get video progress playhead for student
// @route   GET /api/videos/:id/progress
// @access  Private (STUDENT)
export const getVideoProgress = async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;

  try {
    const progress = await prisma.videoProgress.findUnique({
      where: {
        studentId_videoId: {
          studentId,
          videoId: id,
        },
      },
    });

    res.json(progress || { progressSeconds: 0, durationSeconds: 0 });
  } catch (error) {
    console.error('Error fetching video progress:', error);
    res.status(500).json({ message: 'Error fetching video progress' });
  }
};
