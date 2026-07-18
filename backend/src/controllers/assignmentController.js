import prisma from '../db.js';
import { uploadFile } from '../services/uploadService.js';
import fs from 'fs';
import path from 'path';

// @desc    Create a new classroom assignment
// @route   POST /api/classrooms/:classroomId/assignments
// @access  Private (TEACHER, ADMIN)
export const createAssignment = async (req, res) => {
  const { classroomId } = req.params;
  const { title, description, deadline, maxMarks } = req.body;
  const file = req.file;

  if (!title || !description || !deadline || !maxMarks) {
    return res.status(400).json({ message: 'Please provide title, description, deadline, and maxMarks' });
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
      return res.status(403).json({ message: 'Not authorized to create assignments in this classroom' });
    }

    let attachmentUrl = null;
    if (file) {
      const uploadResult = await uploadFile(file);
      attachmentUrl = uploadResult.url;
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        deadline: new Date(deadline),
        maxMarks: parseInt(maxMarks),
        attachmentUrl,
        classroomId,
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Error creating assignment' });
  }
};

// @desc    Get assignments for classroom
// @route   GET /api/classrooms/:classroomId/assignments
// @access  Private
export const getAssignments = async (req, res) => {
  const { classroomId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        enrollments: { select: { studentId: true } }
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Auth verification
    if (role === 'TEACHER' && classroom.teacherId !== userId) {
      return res.status(403).json({ message: 'Not authorized to access this classroom assignments' });
    }

    if (role === 'STUDENT') {
      const isEnrolled = classroom.enrollments.some((e) => e.studentId === userId);
      if (!isEnrolled) {
        return res.status(403).json({ message: 'You are not enrolled in this classroom' });
      }
    }

    let assignments = [];

    if (role === 'TEACHER' || role === 'ADMIN') {
      assignments = await prisma.assignment.findMany({
        where: { classroomId },
        include: {
          submissions: {
            select: { id: true, marks: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      // Map to include counts for teachers
      assignments = assignments.map((a) => ({
        ...a,
        submissionCount: a.submissions.length,
        gradedCount: a.submissions.filter((s) => s.marks !== null).length,
        submissions: undefined
      }));
    } else {
      // Students see details and their submission status
      assignments = await prisma.assignment.findMany({
        where: { classroomId },
        include: {
          submissions: {
            where: { studentId: userId },
            select: { id: true, marks: true, feedback: true, isLate: true, createdAt: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      // Map single submission key
      assignments = assignments.map((a) => ({
        ...a,
        submission: a.submissions[0] || null,
        submissions: undefined
      }));
    }

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Error fetching assignments' });
  }
};

// @desc    Get assignment details
// @route   GET /api/assignments/:id
// @access  Private
export const getAssignmentDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        classroom: true
      }
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    let result = null;

    if (role === 'TEACHER' || role === 'ADMIN') {
      // Teachers get details and all student submissions
      const submissions = await prisma.submission.findMany({
        where: { assignmentId: id },
        include: {
          student: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      result = {
        ...assignment,
        submissions
      };
    } else {
      // Students get details and their own submission
      const submission = await prisma.submission.findUnique({
        where: {
          studentId_assignmentId: {
            studentId: userId,
            assignmentId: id
          }
        }
      });

      result = {
        ...assignment,
        submission
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    res.status(500).json({ message: 'Error fetching assignment details' });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (TEACHER, ADMIN)
export const deleteAssignment = async (req, res) => {
  const { id } = req.params;

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { classroom: true }
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Authorization checks
    if (req.user.role === 'TEACHER' && assignment.classroom.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to manage this assignment' });
    }

    // Cleanup local files
    if (assignment.attachmentUrl && assignment.attachmentUrl.startsWith('http://localhost:5000/uploads/')) {
      const fileName = assignment.attachmentUrl.split('/uploads/')[1];
      const filePath = path.resolve('uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Submissions will cascade delete
    await prisma.assignment.delete({
      where: { id },
    });

    res.json({ message: 'Assignment successfully deleted' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ message: 'Error deleting assignment' });
  }
};

// @desc    Submit assignment (or resubmit before deadline)
// @route   POST /api/assignments/:id/submit
// @access  Private (STUDENT)
export const submitAssignment = async (req, res) => {
  const { id } = req.params;
  const { submissionText } = req.body;
  const file = req.file;
  const studentId = req.user.id;

  if (!file && !submissionText) {
    return res.status(400).json({ message: 'Please provide either a submission file or notes' });
  }

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const now = new Date();
    const isPastDeadline = now > new Date(assignment.deadline);

    // Check if previous submission exists
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        studentId_assignmentId: {
          studentId,
          assignmentId: id
        }
      }
    });

    // Deadline validation constraints:
    // If past deadline:
    // - If it is their first submission, allow upload but flag as isLate: true
    // - If it is a resubmission, reject! Resubmissions are only allowed before deadline.
    if (isPastDeadline) {
      if (existingSubmission) {
        return res.status(400).json({ message: 'Resubmissions are blocked after the assignment deadline has passed.' });
      }
    }

    let fileUrl = existingSubmission?.fileUrl || '';
    if (file) {
      // Upload file
      const uploadResult = await uploadFile(file);
      fileUrl = uploadResult.url;

      // Clean up previous file if overwritten
      if (existingSubmission?.fileUrl && existingSubmission.fileUrl !== fileUrl && existingSubmission.fileUrl.startsWith('http://localhost:5000/uploads/')) {
        const fileName = existingSubmission.fileUrl.split('/uploads/')[1];
        const filePath = path.resolve('uploads', fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    const submission = await prisma.submission.upsert({
      where: {
        studentId_assignmentId: {
          studentId,
          assignmentId: id
        }
      },
      update: {
        fileUrl,
        submissionText: submissionText || existingSubmission?.submissionText,
        isLate: isPastDeadline,
        createdAt: now, // refresh submission timestamp
      },
      create: {
        studentId,
        assignmentId: id,
        fileUrl,
        submissionText: submissionText || '',
        isLate: isPastDeadline,
      }
    });

    res.status(existingSubmission ? 200 : 201).json(submission);
  } catch (error) {
    console.error('Error submitting homework:', error);
    res.status(500).json({ message: 'Error submitting assignment' });
  }
};

// @desc    Grade submission and offer feedback
// @route   POST /api/submissions/:submissionId/grade
// @access  Private (TEACHER, ADMIN)
export const gradeSubmission = async (req, res) => {
  const { submissionId } = req.params;
  const { marks, feedback } = req.body;

  if (marks === undefined) {
    return res.status(400).json({ message: 'Marks score is required' });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { classroom: true }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Teacher authorization checks
    if (req.user.role === 'TEACHER' && submission.assignment.classroom.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to grade this submission' });
    }

    // Validate marks limit
    if (parseInt(marks) > submission.assignment.maxMarks || parseInt(marks) < 0) {
      return res.status(400).json({ message: `Marks must be between 0 and ${submission.assignment.maxMarks}` });
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        marks: parseInt(marks),
        feedback: feedback || '',
        gradedAt: new Date()
      }
    });

    res.json(updatedSubmission);
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ message: 'Error grading submission' });
  }
};
