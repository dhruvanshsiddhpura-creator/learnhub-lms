import prisma from '../db.js';
import { uploadFile } from '../services/uploadService.js';
import fs from 'fs';
import path from 'path';

// @desc    Upload study material file
// @route   POST /api/classrooms/:classroomId/materials
// @access  Private (TEACHER, ADMIN)
export const uploadMaterial = async (req, res) => {
  const { classroomId } = req.params;
  const { title, description, topic } = req.body;
  const file = req.file;

  if (!title || !file) {
    return res.status(400).json({ message: 'Please provide material title and file' });
  }

  try {
    // Verify classroom exists and matches teacher
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (req.user.role === 'TEACHER' && classroom.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to upload to this classroom' });
    }

    // Determine file type category from name extension
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    let fileType = 'OTHER';
    if (['pdf'].includes(ext)) fileType = 'PDF';
    else if (['doc', 'docx'].includes(ext)) fileType = 'DOCX';
    else if (['ppt', 'pptx'].includes(ext)) fileType = 'PPT';
    else if (['zip', 'rar', '7z'].includes(ext)) fileType = 'ZIP';
    else if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) fileType = 'IMAGE';

    // Upload using service
    const uploadResult = await uploadFile(file);

    const material = await prisma.material.create({
      data: {
        title,
        description: description || '',
        fileUrl: uploadResult.url,
        fileType,
        size: file.size,
        topic: topic || 'General',
        classroomId,
      },
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('Material upload error:', error);
    res.status(500).json({ message: 'Error uploading study material' });
  }
};

// @desc    Get materials for classroom
// @route   GET /api/classrooms/:classroomId/materials
// @access  Private
export const getMaterials = async (req, res) => {
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
      return res.status(403).json({ message: 'Not authorized to access this classroom materials' });
    }

    if (role === 'STUDENT') {
      const isEnrolled = classroom.enrollments.some((e) => e.studentId === userId);
      if (!isEnrolled) {
        return res.status(403).json({ message: 'You are not enrolled in this classroom' });
      }
    }

    const materials = await prisma.material.findMany({
      where: { classroomId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Error fetching materials' });
  }
};

// @desc    Delete study material
// @route   DELETE /api/materials/:id
// @access  Private (TEACHER, ADMIN)
export const deleteMaterial = async (req, res) => {
  const { id } = req.params;

  try {
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        classroom: true,
      },
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Authorization
    if (req.user.role === 'TEACHER' && material.classroom.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to manage this material' });
    }

    // Cleanup local storage file if fallback was used
    if (material.fileUrl.startsWith('http://localhost:5000/uploads/')) {
      const fileName = material.fileUrl.split('/uploads/')[1];
      const filePath = path.resolve('uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.material.delete({
      where: { id },
    });

    res.json({ message: 'Material successfully deleted' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ message: 'Error deleting material' });
  }
};
