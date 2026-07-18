import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../context/AuthContext';

// Hook to query the classrooms list (automatically resolves based on role)
export const useClassroomsQuery = () => {
  return useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const res = await api.get('/classrooms');
      return res.data;
    },
  });
};

// Hook to query a specific classroom details and enrolled student rosters
export const useClassroomDetailsQuery = (id) => {
  return useQuery({
    queryKey: ['classroom', id],
    queryFn: async () => {
      const res = await api.get(`/classrooms/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

// Mutation to create a classroom (Teacher/Admin only)
export const useCreateClassroomMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/classrooms', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};

// Mutation to edit a classroom details (Teacher/Admin owner only)
export const useUpdateClassroomMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/classrooms/${id}`, data);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['classroom', variables.id] });
    },
  });
};

// Mutation to delete a classroom (Teacher/Admin owner only)
export const useDeleteClassroomMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/classrooms/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};

// Mutation for a student to join a classroom by unique code
export const useJoinClassroomMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code) => {
      const res = await api.post('/classrooms/join', { code });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};

// Mutation for a student to leave a classroom
export const useLeaveClassroomMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/classrooms/${id}/leave`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};

// ==========================================
// STUDY MATERIALS HOOKS
// ==========================================

export const useClassroomMaterialsQuery = (classroomId) => {
  return useQuery({
    queryKey: ['materials', classroomId],
    queryFn: async () => {
      const res = await api.get(`/classrooms/${classroomId}/materials`);
      return res.data;
    },
    enabled: !!classroomId,
  });
};

export const useUploadMaterialMutation = (classroomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, description, topic, file }) => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('topic', topic || 'General');
      formData.append('file', file);

      const res = await api.post(`/classrooms/${classroomId}/materials`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', classroomId] });
    },
  });
};

export const useDeleteMaterialMutation = (classroomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/materials/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', classroomId] });
    },
  });
};

// ==========================================
// VIDEO LECTURE HOOKS
// ==========================================

export const useClassroomVideosQuery = (classroomId) => {
  return useQuery({
    queryKey: ['videos', classroomId],
    queryFn: async () => {
      const res = await api.get(`/classrooms/${classroomId}/videos`);
      return res.data;
    },
    enabled: !!classroomId,
  });
};

export const useUploadVideoMutation = (classroomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, description, topic, file, youtubeUrl }) => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('topic', topic || 'General');
      if (file) formData.append('file', file);
      if (youtubeUrl) formData.append('youtubeUrl', youtubeUrl);

      const res = await api.post(`/classrooms/${classroomId}/videos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', classroomId] });
    },
  });
};

export const useDeleteVideoMutation = (classroomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/videos/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', classroomId] });
    },
  });
};

// Progress syncing (for students)
export const useSaveVideoProgressMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, progressSeconds, durationSeconds }) => {
      const res = await api.post(`/videos/${videoId}/progress`, {
        progressSeconds,
        durationSeconds,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['videoProgress', variables.videoId] });
    },
  });
};

export const useVideoProgressQuery = (videoId) => {
  return useQuery({
    queryKey: ['videoProgress', videoId],
    queryFn: async () => {
      const res = await api.get(`/videos/${videoId}/progress`);
      return res.data;
    },
    enabled: !!videoId,
  });
};

// ==========================================
// ASSIGNMENT & SUBMISSION HOOKS
// ==========================================

export const useClassroomAssignmentsQuery = (classroomId) => {
  return useQuery({
    queryKey: ['assignments', classroomId],
    queryFn: async () => {
      const res = await api.get(`/classrooms/${classroomId}/assignments`);
      return res.data;
    },
    enabled: !!classroomId,
  });
};

export const useAssignmentDetailsQuery = (id) => {
  return useQuery({
    queryKey: ['assignmentDetails', id],
    queryFn: async () => {
      const res = await api.get(`/assignments/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateAssignmentMutation = (classroomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, description, deadline, maxMarks, file }) => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('deadline', deadline);
      formData.append('maxMarks', maxMarks);
      if (file) formData.append('file', file);

      const res = await api.post(`/classrooms/${classroomId}/assignments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', classroomId] });
    },
  });
};

export const useDeleteAssignmentMutation = (classroomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/assignments/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', classroomId] });
    },
  });
};

export const useSubmitAssignmentMutation = (assignmentId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionText, file }) => {
      const formData = new FormData();
      if (submissionText) formData.append('submissionText', submissionText);
      if (file) formData.append('file', file);

      const res = await api.post(`/assignments/${assignmentId}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignmentDetails', assignmentId] });
    },
  });
};

export const useGradeSubmissionMutation = (assignmentId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, marks, feedback }) => {
      const res = await api.post(`/submissions/${submissionId}/grade`, {
        marks,
        feedback,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignmentDetails', assignmentId] });
    },
  });
};

// ==========================================
// CHAT & DIRECT MESSAGING HOOKS
// ==========================================

export const useChatRosterQuery = (classroomId) => {
  return useQuery({
    queryKey: ['chatRoster', classroomId],
    queryFn: async () => {
      const res = await api.get(`/classrooms/${classroomId}/chats`);
      return res.data;
    },
    enabled: !!classroomId,
  });
};

export const useChatConversationQuery = (classroomId, studentId) => {
  return useQuery({
    queryKey: ['chatConversation', classroomId, studentId],
    queryFn: async () => {
      const res = await api.get(`/classrooms/${classroomId}/chats/${studentId}/messages`);
      return res.data;
    },
    enabled: !!classroomId && !!studentId,
  });
};

export const useSendMessageMutation = (classroomId, studentId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, file }) => {
      const formData = new FormData();
      if (content) formData.append('content', content);
      if (file) formData.append('file', file);

      const res = await api.post(`/classrooms/${classroomId}/chats/${studentId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    // Don't invalidate automatically if we rely on socket updates, 
    // but useful as a fallback.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatConversation', classroomId, studentId] });
    },
  });
};

// ==========================================
// DOUBT FORUM HOOKS
// ==========================================

export const useDoubtsQuery = (classroomId, search = '', resolved = undefined) => {
  return useQuery({
    queryKey: ['doubts', classroomId, search, resolved],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (resolved !== undefined) params.append('resolved', resolved);
      
      const res = await api.get(`/classrooms/${classroomId}/doubts?${params.toString()}`);
      return res.data;
    },
    enabled: !!classroomId,
  });
};

export const useDoubtDetailsQuery = (classroomId, doubtId) => {
  return useQuery({
    queryKey: ['doubtDetails', doubtId],
    queryFn: async () => {
      const res = await api.get(`/classrooms/${classroomId}/doubts/${doubtId}`);
      return res.data;
    },
    enabled: !!classroomId && !!doubtId,
  });
};

export const useCreateDoubtMutation = (classroomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, content }) => {
      const res = await api.post(`/classrooms/${classroomId}/doubts`, { title, content });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doubts', classroomId] });
    },
  });
};

export const useReplyDoubtMutation = (classroomId, doubtId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content }) => {
      const res = await api.post(`/classrooms/${classroomId}/doubts/${doubtId}/replies`, { content });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doubtDetails', doubtId] });
      queryClient.invalidateQueries({ queryKey: ['doubts', classroomId] });
    },
  });
};

export const useResolveDoubtMutation = (classroomId, doubtId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.put(`/classrooms/${classroomId}/doubts/${doubtId}/resolve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doubtDetails', doubtId] });
      queryClient.invalidateQueries({ queryKey: ['doubts', classroomId] });
    },
  });
};

export const useToggleUpvoteMutation = (classroomId, doubtId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (replyId) => {
      // Endpoint is /api/classrooms/:classroomId/doubts/replies/:replyId/upvote
      const res = await api.post(`/classrooms/${classroomId}/doubts/replies/${replyId}/upvote`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doubtDetails', doubtId] });
    },
  });
};

// ==========================================
// QUIZ & ASSESSMENT HOOKS
// ==========================================

export const useQuizzesQuery = (classroomId) => {
  return useQuery({
    queryKey: ['quizzes', classroomId],
    queryFn: async () => {
      const res = await api.get(`/classrooms/${classroomId}/quizzes`);
      return res.data;
    },
    enabled: !!classroomId,
  });
};

export const useQuizDetailsQuery = (classroomId, quizId) => {
  return useQuery({
    queryKey: ['quizDetails', quizId],
    queryFn: async () => {
      const res = await api.get(`/classrooms/${classroomId}/quizzes/${quizId}`);
      return res.data;
    },
    enabled: !!classroomId && !!quizId,
  });
};

export const useCreateQuizMutation = (classroomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/classrooms/${classroomId}/quizzes`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', classroomId] });
    },
  });
};

export const useUpdateQuizMutation = (classroomId, quizId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.put(`/classrooms/${classroomId}/quizzes/${quizId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', classroomId] });
      queryClient.invalidateQueries({ queryKey: ['quizDetails', quizId] });
    },
  });
};

export const useDeleteQuizMutation = (classroomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quizId) => {
      const res = await api.delete(`/classrooms/${classroomId}/quizzes/${quizId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', classroomId] });
    },
  });
};

export const useAddQuestionMutation = (classroomId, quizId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/classrooms/${classroomId}/quizzes/${quizId}/questions`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizDetails', quizId] });
    },
  });
};

export const useUpdateQuestionMutation = (classroomId, quizId, questionId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.put(`/classrooms/${classroomId}/quizzes/${quizId}/questions/${questionId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizDetails', quizId] });
    },
  });
};

export const useDeleteQuestionMutation = (classroomId, quizId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questionId) => {
      const res = await api.delete(`/classrooms/${classroomId}/quizzes/${quizId}/questions/${questionId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizDetails', quizId] });
    },
  });
};

export const useStartQuizMutation = (classroomId, quizId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post(`/classrooms/${classroomId}/quizzes/${quizId}/start`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizDetails', quizId] });
      queryClient.invalidateQueries({ queryKey: ['quizzes', classroomId] });
    },
  });
};

export const useSubmitQuizMutation = (classroomId, quizId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ answers, timeTaken }) => {
      const res = await api.post(`/classrooms/${classroomId}/quizzes/${quizId}/submit`, { answers, timeTaken });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizDetails', quizId] });
      queryClient.invalidateQueries({ queryKey: ['quizzes', classroomId] });
      queryClient.invalidateQueries({ queryKey: ['quizResults', quizId] });
    },
  });
};

export const useQuizResultsQuery = (classroomId, quizId) => {
  return useQuery({
    queryKey: ['quizResults', quizId],
    queryFn: async () => {
      const res = await api.get(`/classrooms/${classroomId}/quizzes/${quizId}/results`);
      return res.data;
    },
    enabled: !!classroomId && !!quizId,
  });
};
