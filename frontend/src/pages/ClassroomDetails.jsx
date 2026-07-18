import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import {
  useClassroomDetailsQuery,
  useUpdateClassroomMutation,
  useDeleteClassroomMutation,
  useLeaveClassroomMutation,
  useClassroomMaterialsQuery,
  useUploadMaterialMutation,
  useDeleteMaterialMutation,
  useClassroomVideosQuery,
  useUploadVideoMutation,
  useDeleteVideoMutation,
  useSaveVideoProgressMutation,
  useVideoProgressQuery,
  useClassroomAssignmentsQuery,
  useCreateAssignmentMutation,
  useDeleteAssignmentMutation
} from '../api/classroomApi';
import ChatHelp from '../components/ChatHelp';
import DoubtForum from '../components/DoubtForum';
import QuizList from '../components/QuizList';
import {
  ArrowLeft,
  Calendar,
  Users,
  Copy,
  Check,
  Edit2,
  Trash2,
  LogOut,
  User,
  Mail,
  School,
  X,
  FileText,
  Video as VideoIcon,
  Upload,
  Download,
  Eye,
  Play,
  Search,
  Plus,
  BookOpen,
  ClipboardList,
  Clock,
  Award,
  ChevronRight
} from 'lucide-react';

const Youtube = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" className={props.className}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.388.511a3.003 3.003 0 0 0-2.11 2.107C0 8.053 0 12 0 12s0 3.947.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.495 20.455 12 20.455 12 20.455s7.505 0 9.388-.511a3.003 3.003 0 0 0 2.11-2.107C24 15.947 24 12 24 12s0-3.947-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const ClassroomDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Queries & Mutations
  const { data: classroom, isLoading, error } = useClassroomDetailsQuery(id);
  const updateMutation = useUpdateClassroomMutation();
  const deleteMutation = useDeleteClassroomMutation();
  const leaveMutation = useLeaveClassroomMutation();

  // Materials & Videos Queries/Mutations
  const { data: materials, isLoading: materialsLoading } = useClassroomMaterialsQuery(id);
  const uploadMaterialMutation = useUploadMaterialMutation(id);
  const deleteMaterialMutation = useDeleteMaterialMutation(id);

  const { data: videos, isLoading: videosLoading } = useClassroomVideosQuery(id);
  const uploadVideoMutation = useUploadVideoMutation(id);
  const deleteVideoMutation = useDeleteVideoMutation(id);
  const saveProgressMutation = useSaveVideoProgressMutation();

  // Assignments Queries/Mutations
  const { data: assignments, isLoading: assignmentsLoading } = useClassroomAssignmentsQuery(id);
  const createAssignmentMutation = useCreateAssignmentMutation(id);
  const deleteAssignmentMutation = useDeleteAssignmentMutation(id);

  // Local View States
  const [activeSubTab, setActiveSubTab] = useState('roster'); // roster, materials, videos, assignments
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialForm, setMaterialForm] = useState({ title: '', description: '', topic: 'General', file: null });

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoForm, setVideoForm] = useState({ title: '', description: '', topic: 'General', file: null, youtubeUrl: '', uploadType: 'file' });

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', deadline: '', maxMarks: 100, file: null });

  // Preview & Players
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [activePlayerVideo, setActivePlayerVideo] = useState(null);
  const videoPlayerRef = useRef(null);
  const lastSavedTimeRef = useRef(0);

  // Success Alert Toast
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const triggerAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000);
  };

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const fetchAttendance = async (date) => {
    if (!isTeacher) return;
    setAttendanceLoading(true);
    try {
      const res = await api.get(`/classrooms/${id}/attendance?date=${date}`);
      // res.data.students contains all students, res.data.attendances contains records
      const initialRecords = res.data.students.map(student => {
        const existing = res.data.attendances.find(a => a.studentId === student.id);
        return {
          studentId: student.id,
          student: student,
          status: existing ? existing.status : 'PRESENT' // default to present if no record
        };
      });
      setAttendanceRecords(initialRecords);
    } catch (err) {
      triggerAlert('Failed to load attendance', 'error');
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'attendance') {
      fetchAttendance(attendanceDate);
    }
  }, [activeSubTab, attendanceDate]);

  const handleSaveAttendance = async () => {
    setCreateLoading(true);
    try {
      const recordsToSave = attendanceRecords.map(r => ({ studentId: r.studentId, status: r.status }));
      await api.post(`/classrooms/${id}/attendance`, { date: attendanceDate, records: recordsToSave });
      triggerAlert('Attendance saved successfully!');
    } catch (err) {
      triggerAlert('Failed to save attendance', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // Resume progress mapping inside active video player
  useEffect(() => {
    if (activePlayerVideo && videoPlayerRef.current) {
      const savedProgress = activePlayerVideo.progress?.progressSeconds || 0;
      if (savedProgress > 2) {
        const timer = setTimeout(() => {
          if (videoPlayerRef.current) {
            videoPlayerRef.current.currentTime = savedProgress;
            triggerAlert(`Resumed video from last watched position: ${Math.floor(savedProgress)}s`);
          }
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [activePlayerVideo]);

  const handleCopyCode = () => {
    if (!classroom) return;
    navigator.clipboard.writeText(classroom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    triggerAlert('Classroom code copied to clipboard!');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({ id, data: editForm });
      triggerAlert('Classroom updated successfully!');
      setShowEditModal(false);
    } catch (err) {
      triggerAlert('Failed to update classroom', 'error');
    }
  };

  const handleDeleteClass = async () => {
    if (!window.confirm('WARNING: Are you sure you want to permanently delete this classroom? All student enrollments, study materials, video lectures, and assignments will be lost.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/dashboard');
    } catch (err) {
      triggerAlert('Failed to delete classroom', 'error');
    }
  };

  const handleLeaveClass = async () => {
    if (!window.confirm('Are you sure you want to leave this classroom?')) return;
    try {
      await leaveMutation.mutateAsync(id);
      navigate('/dashboard');
    } catch (err) {
      triggerAlert('Failed to leave classroom', 'error');
    }
  };

  // ==========================================
  // MATERIALS & VIDEO ACTION HANDLERS
  // ==========================================

  // Drag and Drop helpers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setMaterialForm({ ...materialForm, file: e.dataTransfer.files[0] });
    }
  };

  const handleMaterialUploadSubmit = async (e) => {
    e.preventDefault();
    if (!materialForm.file) return triggerAlert('Please select a file to upload', 'error');
    setCreateLoading(true);
    try {
      await uploadMaterialMutation.mutateAsync(materialForm);
      triggerAlert('Study material uploaded successfully!');
      setShowMaterialModal(false);
      setMaterialForm({ title: '', description: '', topic: 'General', file: null });
    } catch (err) {
      triggerAlert(err.response?.data?.message || 'Error uploading material', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleMaterialDelete = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this study material?')) return;
    try {
      await deleteMaterialMutation.mutateAsync(materialId);
      triggerAlert('Study material deleted successfully.');
    } catch (err) {
      triggerAlert('Error deleting material', 'error');
    }
  };

  const handleVideoUploadSubmit = async (e) => {
    e.preventDefault();
    if (videoForm.uploadType === 'file' && !videoForm.file) {
      return triggerAlert('Please select a video file', 'error');
    }
    if (videoForm.uploadType === 'youtube' && !videoForm.youtubeUrl) {
      return triggerAlert('Please enter a YouTube video URL', 'error');
    }

    setCreateLoading(true);
    try {
      await uploadVideoMutation.mutateAsync(videoForm);
      triggerAlert('Video lecture added successfully!');
      setShowVideoModal(false);
      setVideoForm({ title: '', description: '', topic: 'General', file: null, youtubeUrl: '', uploadType: 'file' });
    } catch (err) {
      triggerAlert(err.response?.data?.message || 'Error adding video lecture', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleVideoDelete = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video lecture?')) return;
    try {
      await deleteVideoMutation.mutateAsync(videoId);
      triggerAlert('Video lecture deleted successfully.');
      if (activePlayerVideo?.id === videoId) setActivePlayerVideo(null);
    } catch (err) {
      triggerAlert('Error deleting video', 'error');
    }
  };

  // HTML5 Video Playhead Progress Sync
  const handleVideoTimeUpdate = () => {
    if (!videoPlayerRef.current || !activePlayerVideo || user.role !== 'STUDENT') return;
    
    const currentTime = videoPlayerRef.current.currentTime;
    const duration = videoPlayerRef.current.duration;
    
    if (Math.abs(currentTime - lastSavedTimeRef.current) > 4) {
      lastSavedTimeRef.current = currentTime;
      saveProgressMutation.mutate({
        videoId: activePlayerVideo.id,
        progressSeconds: currentTime,
        durationSeconds: duration
      });
    }
  };

  const handleVideoEnded = () => {
    if (!videoPlayerRef.current || !activePlayerVideo || user.role !== 'STUDENT') return;
    saveProgressMutation.mutate({
      videoId: activePlayerVideo.id,
      progressSeconds: videoPlayerRef.current.duration,
      durationSeconds: videoPlayerRef.current.duration
    });
  };

  // ==========================================
  // ASSIGNMENTS ACTION HANDLERS
  // ==========================================

  const handleAssignmentCreateSubmit = async (e) => {
    e.preventDefault();
    if (!assignmentForm.title || !assignmentForm.description || !assignmentForm.deadline || !assignmentForm.maxMarks) {
      return triggerAlert('Please fill in all mandatory fields', 'error');
    }

    setCreateLoading(true);
    try {
      await createAssignmentMutation.mutateAsync(assignmentForm);
      triggerAlert('Assignment published successfully!');
      setShowAssignmentModal(false);
      setAssignmentForm({ title: '', description: '', deadline: '', maxMarks: 100, file: null });
    } catch (err) {
      triggerAlert(err.response?.data?.message || 'Error creating assignment', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAssignmentDelete = async (e, assignmentId) => {
    e.stopPropagation(); // prevent card click redirect
    if (!window.confirm('WARNING: Deleting this assignment will permanently delete all student submissions, marks, and grading feedback. Continue?')) return;
    try {
      await deleteAssignmentMutation.mutateAsync(assignmentId);
      triggerAlert('Assignment deleted successfully.');
    } catch (err) {
      triggerAlert('Error deleting assignment', 'error');
    }
  };

  // Helper formatting for bytes sizing
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary-500 animate-spin"></div>
        </div>
        <p className="mt-4 text-dark-400 font-semibold animate-pulse">Syncing classroom syllabus...</p>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Classroom not found</h2>
          <p className="text-sm text-dark-400">
            {error?.response?.data?.message || 'The classroom you are trying to view does not exist or you do not have permission.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isTeacher = user.role === 'TEACHER' && classroom.teacherId === user.id;

  // Filter lists
  const filteredMaterials = (materials || []).filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredVideos = (videos || []).filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAssignments = (assignments || []).filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group materials by topic
  const groupedMaterials = filteredMaterials.reduce((acc, material) => {
    const topic = material.topic || 'General';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(material);
    return acc;
  }, {});

  // Extract YouTube ID
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?enablejsapi=1` : '';
  };

  return (
    <div className="min-h-screen bg-dark-950 text-dark-50 p-4 sm:p-6 relative overflow-hidden">
      {/* Toast Alert */}
      {alert.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-slide-up ${
          alert.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${alert.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-sm font-semibold">{alert.message}</span>
        </div>
      )}

      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-primary-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none"></div>

      <div className="max-w-6xl w-full mx-auto space-y-6 relative z-10 animate-fade-in">
        
        {/* Navigation / Actions Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-semibold text-dark-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Workspace
          </button>
          
          <div className="flex gap-2">
            {isTeacher ? (
              <>
                <button
                  onClick={() => { setEditForm({ name: classroom.name, description: classroom.description }); setShowEditModal(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-semibold text-dark-200 hover:bg-dark-850 hover:text-white transition-all"
                >
                  <Edit2 size={14} />
                  Edit Classroom
                </button>
                <button
                  onClick={handleDeleteClass}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-950/20 border border-red-500/30 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all"
                >
                  <Trash2 size={14} />
                  Delete Classroom
                </button>
              </>
            ) : (
              user.role === 'STUDENT' && (
                <button
                  onClick={handleLeaveClass}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-950/20 border border-red-500/30 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all"
                >
                  <LogOut size={14} />
                  Leave Classroom
                </button>
              )
            )}
          </div>
        </div>

        {/* Classroom Info Hero Panel */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-dark-800 grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative">
          <div className="md:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-300 text-xs font-semibold">
              <School size={14} /> LearnHub
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {classroom.name}
            </h1>
            <p className="text-xs sm:text-sm text-dark-300 leading-relaxed max-w-2xl whitespace-pre-wrap">
              {classroom.description}
            </p>

            <div className="pt-2 flex items-center gap-3">
              <img src={classroom.teacher.avatar} alt={classroom.teacher.name} className="w-8 h-8 rounded-full border border-dark-750" />
              <div>
                <h5 className="text-[10px] font-bold text-dark-500 uppercase tracking-widest leading-none mb-1">Teacher</h5>
                <span className="text-xs font-bold text-dark-200">{classroom.teacher.name}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 w-full glass-card p-6 rounded-xl border border-dark-800 space-y-6">
            <div>
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-widest block mb-2">Classroom Join Code</span>
              <div className="flex items-center gap-2 bg-dark-950 border border-dark-800 rounded-xl p-3 relative overflow-hidden group">
                <span className="text-xl font-black text-white tracking-wider flex-1 text-center font-mono">
                  {classroom.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-dark-900 border border-dark-800 text-dark-400 hover:text-white hover:bg-dark-800 transition-all"
                  title="Copy Join Code"
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-dark-500 mt-2 text-center italic">
                Share this unique code with students.
              </p>
            </div>

            <div className="border-t border-dark-800/80 pt-4 grid grid-cols-2 gap-4">
              <div className="text-center">
                <Users size={16} className="text-primary-400 mx-auto mb-1.5" />
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Students</span>
                <span className="text-lg font-black text-white mt-1 block">{classroom.studentCount}</span>
              </div>
              <div className="text-center">
                <Calendar size={16} className="text-cyan-400 mx-auto mb-1.5" />
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Created</span>
                <span className="text-xs font-black text-white mt-2 block">
                  {new Date(classroom.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="flex justify-between items-center border-b border-dark-800 pb-1">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <button
              onClick={() => { setActiveSubTab('roster'); setSearchQuery(''); }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeSubTab === 'roster' ? 'border-primary-500 text-white' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              Class Roster
            </button>
            {isTeacher && (
              <button
                onClick={() => { setActiveSubTab('attendance'); setSearchQuery(''); }}
                className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                  activeSubTab === 'attendance' ? 'border-primary-500 text-white' : 'border-transparent text-dark-400 hover:text-white'
                }`}
              >
                Attendance
              </button>
            )}
            <button
              onClick={() => { setActiveSubTab('materials'); setSearchQuery(''); }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeSubTab === 'materials' ? 'border-primary-500 text-white' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              Study Materials
            </button>
            <button
              onClick={() => { setActiveSubTab('videos'); setSearchQuery(''); }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeSubTab === 'videos' ? 'border-primary-500 text-white' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              Video Lectures
            </button>
            <button
              onClick={() => { setActiveSubTab('assignments'); setSearchQuery(''); }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeSubTab === 'assignments' ? 'border-primary-500 text-white' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              Assignments
            </button>
            <button
              onClick={() => { setActiveSubTab('chat'); setSearchQuery(''); }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeSubTab === 'chat' ? 'border-primary-500 text-white' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => { setActiveSubTab('doubts'); setSearchQuery(''); }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeSubTab === 'doubts' ? 'border-primary-500 text-white' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              Doubt Forum
            </button>
            <button
              onClick={() => { setActiveSubTab('quizzes'); setSearchQuery(''); }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeSubTab === 'quizzes' ? 'border-primary-500 text-white' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              Quizzes
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeSubTab !== 'roster' && (
              <div className="relative hidden sm:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  placeholder="Filter by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-36 rounded-xl text-xs glass-input text-white"
                />
              </div>
            )}

            {/* Teacher action triggers */}
            {isTeacher && activeSubTab === 'materials' && (
              <button
                onClick={() => setShowMaterialModal(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
              >
                <Plus size={14} /> Upload Material
              </button>
            )}

            {isTeacher && activeSubTab === 'videos' && (
              <button
                onClick={() => setShowVideoModal(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
              >
                <Plus size={14} /> Upload Video
              </button>
            )}

            {isTeacher && activeSubTab === 'assignments' && (
              <button
                onClick={() => setShowAssignmentModal(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
              >
                <Plus size={14} /> Create Assignment
              </button>
            )}
          </div>
        </div>

        {/* TABS CONTAINER PANELS */}
        
        {/* TABS 1: ROSTER VIEW */}
        {activeSubTab === 'roster' && (
          <section className="space-y-4 animate-fade-in">
            {classroom.students.length === 0 ? (
              <div className="glass-panel p-12 rounded-xl text-center space-y-4 border border-dashed border-dark-750 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-dark-900 flex items-center justify-center mx-auto text-dark-500">
                  <Users size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No students enrolled yet</h4>
                  <p className="text-xs text-dark-400 leading-relaxed">
                    Share the classroom code <span className="font-mono font-bold text-primary-400">{classroom.code}</span> to invite students.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classroom.students.map((student) => (
                  <div key={student.id} className="glass-card p-4 rounded-xl border border-dark-800/80 flex items-center gap-3">
                    <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full border border-dark-700" />
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-white truncate">{student.name}</h4>
                      <span className="text-[10px] text-dark-400 flex items-center gap-1 mt-0.5 truncate">
                        <Mail size={10} />
                        {student.email}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TABS 1.5: ATTENDANCE VIEW (TEACHERS ONLY) */}
        {activeSubTab === 'attendance' && isTeacher && (
          <section className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center bg-dark-900/50 p-4 rounded-xl border border-dark-800">
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs font-bold text-dark-400 uppercase tracking-widest block mb-1">Date</label>
                  <input 
                    type="date" 
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="glass-input px-3 py-1.5 rounded-lg text-sm text-white"
                  />
                </div>
              </div>
              <button 
                onClick={handleSaveAttendance}
                disabled={createLoading}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Check size={14} />
                {createLoading ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>

            {attendanceLoading ? (
              <div className="text-center p-8 text-dark-400 animate-pulse">Loading attendance records...</div>
            ) : attendanceRecords.length === 0 ? (
              <div className="glass-panel p-12 rounded-xl text-center text-dark-400">No students enrolled.</div>
            ) : (
              <div className="bg-dark-900/30 rounded-xl border border-dark-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-dark-900/80 border-b border-dark-800 text-xs font-bold text-dark-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4 w-64 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {attendanceRecords.map((record, idx) => (
                      <tr key={record.studentId} className="hover:bg-dark-850/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={record.student.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-dark-700" />
                            <div>
                              <div className="font-semibold text-white">{record.student.name}</div>
                              <div className="text-xs text-dark-400">{record.student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center bg-dark-950 p-1 rounded-lg border border-dark-800">
                            <button
                              onClick={() => {
                                const newRecords = [...attendanceRecords];
                                newRecords[idx].status = 'PRESENT';
                                setAttendanceRecords(newRecords);
                              }}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                record.status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-dark-400 hover:text-white'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => {
                                const newRecords = [...attendanceRecords];
                                newRecords[idx].status = 'ABSENT';
                                setAttendanceRecords(newRecords);
                              }}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                record.status === 'ABSENT' ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm' : 'text-dark-400 hover:text-white'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TABS 2: STUDY MATERIALS VIEW */}
        {activeSubTab === 'materials' && (
          <section className="space-y-6 animate-fade-in">
            {materialsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-16 bg-dark-900 rounded-xl animate-pulse-subtle" />
                ))}
              </div>
            ) : Object.keys(groupedMaterials).length === 0 ? (
              <div className="glass-panel p-12 rounded-xl text-center space-y-4 border border-dashed border-dark-750 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-dark-900 flex items-center justify-center mx-auto text-dark-500">
                  <FileText size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No materials uploaded</h4>
                  <p className="text-xs text-dark-400 leading-relaxed font-normal">
                    {isTeacher ? "Get started by uploading PDFs, DOCX, or ZIP files." : "Your teacher hasn't shared any study materials yet."}
                  </p>
                </div>
              </div>
            ) : (
              Object.keys(groupedMaterials).map((topic) => (
                <div key={topic} className="space-y-3">
                  <h4 className="text-xs font-bold text-dark-400 uppercase tracking-widest border-l-2 border-primary-500 pl-2">
                    {topic}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedMaterials[topic].map((material) => (
                      <div key={material.id} className="glass-card p-4 rounded-xl border border-dark-800/80 flex flex-col justify-between h-40">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider text-white ${
                              material.fileType === 'PDF' ? 'bg-red-600/80 border border-red-500/20' :
                              material.fileType === 'ZIP' ? 'bg-amber-600/80 border border-amber-500/20' :
                              material.fileType === 'DOCX' ? 'bg-blue-600/80 border border-blue-500/20' :
                              material.fileType === 'PPT' ? 'bg-yellow-600/80 border border-yellow-500/20' :
                              'bg-purple-600/80 border border-purple-500/20'
                            }`}>
                              {material.fileType}
                            </span>
                            
                            {isTeacher && (
                              <button
                                onClick={() => handleMaterialDelete(material.id)}
                                className="text-dark-500 hover:text-red-400 transition-colors p-1"
                                title="Delete Document"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          <h5 className="text-sm font-bold text-white mt-2 line-clamp-1">{material.title}</h5>
                          <p className="text-[10px] text-dark-450 mt-1 line-clamp-2 leading-relaxed">{material.description}</p>
                        </div>

                        <div className="flex items-center justify-between border-t border-dark-805/40 pt-3 mt-3">
                          <span className="text-[9px] text-dark-450 font-medium">
                            {formatBytes(material.size)}
                          </span>

                          <div className="flex gap-2">
                            {material.fileType === 'PDF' && (
                              <button
                                onClick={() => setPreviewPdfUrl(material.fileUrl)}
                                className="p-1.5 rounded-lg bg-dark-900 border border-dark-800 text-dark-300 hover:text-white transition-colors"
                                title="Preview PDF"
                              >
                                <Eye size={12} />
                              </button>
                            )}
                            <a
                              href={material.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="p-1.5 rounded-lg bg-primary-950/40 border border-primary-500/20 text-primary-400 hover:text-primary-300 hover:bg-primary-950/80 transition-colors"
                              title="Download Asset"
                            >
                              <Download size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {/* TABS 3: VIDEO LECTURES VIEW */}
        {activeSubTab === 'videos' && (
          <section className="space-y-6 animate-fade-in">
            {activePlayerVideo && (
              <div className="glass-panel p-4 rounded-2xl border border-dark-800 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-4">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-dark-800">
                    {activePlayerVideo.youtubeUrl ? (
                      <iframe
                        src={getYouTubeEmbedUrl(activePlayerVideo.youtubeUrl)}
                        title={activePlayerVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    ) : (
                      <video
                        ref={videoPlayerRef}
                        src={activePlayerVideo.videoUrl}
                        controls
                        onTimeUpdate={handleVideoTimeUpdate}
                        onEnded={handleVideoEnded}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-white leading-snug">{activePlayerVideo.title}</h4>
                      <p className="text-xs text-dark-400 mt-1">{activePlayerVideo.description}</p>
                    </div>
                    <button
                      onClick={() => { setActivePlayerVideo(null); lastSavedTimeRef.current = 0; }}
                      className="px-3.5 py-1.5 bg-dark-900 border border-dark-800 rounded-lg text-[10px] text-dark-300 hover:text-white font-semibold"
                    >
                      Close Player
                    </button>
                  </div>
                </div>
                
                <div className="lg:col-span-4 space-y-4">
                  <h5 className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">Modules Lecture List</h5>
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredVideos.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => { setActivePlayerVideo(v); lastSavedTimeRef.current = 0; }}
                        className={`p-3 rounded-lg border cursor-pointer flex gap-3 items-center transition-all ${
                          activePlayerVideo.id === v.id
                            ? 'border-primary-500/50 bg-primary-600/10'
                            : 'border-dark-850 bg-dark-900/30 hover:border-dark-750'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          v.youtubeUrl ? 'bg-red-500/10 text-red-400' : 'bg-primary-500/10 text-primary-400'
                        }`}>
                          {v.youtubeUrl ? <Youtube size={16} /> : <Play size={14} />}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <h6 className="text-xs font-bold text-white truncate">{v.title}</h6>
                          <span className="text-[9px] text-dark-450 block truncate">{v.topic}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {videosLoading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-16 bg-dark-900 rounded-xl animate-pulse-subtle" />
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="glass-panel p-12 rounded-xl text-center space-y-4 border border-dashed border-dark-750 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-dark-900 flex items-center justify-center mx-auto text-dark-500">
                  <VideoIcon size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No video lectures uploaded</h4>
                  <p className="text-xs text-dark-400 leading-relaxed font-normal">
                    {isTeacher ? "Publish custom video files or link YouTube lectures." : "Your teacher has not uploaded any video lectures yet."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((video) => {
                  const progressPct = video.progress 
                    ? Math.min(100, Math.round((video.progress.progressSeconds / video.progress.durationSeconds) * 100))
                    : 0;

                  return (
                    <div
                      key={video.id}
                      onClick={() => { setActivePlayerVideo(video); lastSavedTimeRef.current = 0; }}
                      className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg h-56 border border-dark-800/80 cursor-pointer group"
                    >
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="px-2.5 py-0.5 text-[8px] font-extrabold uppercase bg-primary-600/10 border border-primary-500/20 text-primary-300 rounded-lg tracking-wider">
                            {video.topic}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            {video.youtubeUrl ? (
                              <Youtube size={15} className="text-red-500" />
                            ) : (
                              <VideoIcon size={14} className="text-cyan-400" />
                            )}
                            
                            {isTeacher && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleVideoDelete(video.id); }}
                                className="text-dark-500 hover:text-red-400 transition-colors p-1"
                                title="Delete Video"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="text-base font-bold text-white tracking-tight leading-snug group-hover:text-primary-300 transition-colors line-clamp-2">
                          {video.title}
                        </h4>
                        <p className="text-[11px] text-dark-400 leading-relaxed line-clamp-2">
                          {video.description}
                        </p>
                      </div>

                      <div className="p-5 pt-0 space-y-3">
                        {user.role === 'STUDENT' && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-semibold text-dark-400 uppercase tracking-wide">
                              <span>Playback status</span>
                              <span>{progressPct}% Watched</span>
                            </div>
                            <div className="h-1.5 w-full bg-dark-900 border border-dark-850 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 transition-all duration-350"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <button className="w-full py-2.5 bg-dark-900 border border-dark-800 text-dark-100 font-bold text-xs rounded-xl group-hover:bg-primary-600 group-hover:text-white transition-colors flex items-center justify-center gap-2">
                          <Play size={12} fill="currentColor" /> Play Lecture
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TABS 4: ASSIGNMENTS VIEW */}
        {activeSubTab === 'assignments' && (
          <section className="space-y-6 animate-fade-in">
            {assignmentsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-20 bg-dark-900 rounded-xl animate-pulse-subtle" />
                ))}
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="glass-panel p-12 rounded-xl text-center space-y-4 border border-dashed border-dark-750 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-dark-900 flex items-center justify-center mx-auto text-dark-500">
                  <ClipboardList size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No assignments published</h4>
                  <p className="text-xs text-dark-400 leading-relaxed font-normal">
                    {isTeacher ? "Click Create Assignment above to add homework." : "Your teacher has not published any assignments yet."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredAssignments.map((assignment) => {
                  const deadlineDate = new Date(assignment.deadline);
                  const isOverdue = new Date() > deadlineDate;

                  // Student badge resolvers
                  let statusText = 'Pending';
                  let statusClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400';

                  if (user.role === 'STUDENT') {
                    const sub = assignment.submission;
                    if (sub) {
                      if (sub.marks !== null) {
                        statusText = `Graded (${sub.marks} / ${assignment.maxMarks})`;
                        statusClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                      } else if (sub.isLate) {
                        statusText = 'Submitted Late';
                        statusClass = 'bg-red-500/10 border-red-500/20 text-red-400';
                      } else {
                        statusText = 'Submitted';
                        statusClass = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                      }
                    } else if (isOverdue) {
                      statusText = 'Missing (Late)';
                      statusClass = 'bg-red-950/20 border-red-500/25 text-red-400';
                    }
                  }

                  return (
                    <div
                      key={assignment.id}
                      onClick={() => navigate(`/classroom/${id}/assignment/${assignment.id}`)}
                      className="glass-card p-5 rounded-2xl border border-dark-800 hover:border-primary-500/35 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-white group-hover:text-primary-300 transition-colors">
                            {assignment.title}
                          </h4>

                          {/* Student Status Badge */}
                          {user.role === 'STUDENT' && (
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${statusClass}`}>
                              {statusText}
                            </span>
                          )}

                          {/* Teacher Count Badge */}
                          {isTeacher && (
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-300">
                              {assignment.submissionCount} submitted
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-dark-400 line-clamp-1 max-w-2xl font-normal leading-normal">
                          {assignment.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 border-dark-850 pt-3 md:pt-0">
                        {/* Marks & Deadlines details */}
                        <div className="flex gap-4 items-center">
                          <div className="text-right">
                            <span className="text-[9px] font-bold text-dark-500 uppercase tracking-widest block">Deadline</span>
                            <span className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-400' : 'text-dark-200'}`}>
                              <Clock size={12} />
                              {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="text-right border-l border-dark-800 pl-4">
                            <span className="text-[9px] font-bold text-dark-500 uppercase tracking-widest block">Max Marks</span>
                            <span className="text-xs font-bold text-white flex items-center gap-1 mt-0.5 justify-end">
                              <Award size={12} className="text-amber-500" />
                              {assignment.maxMarks}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1 items-center">
                          {isTeacher && (
                            <button
                              onClick={(e) => handleAssignmentDelete(e, assignment.id)}
                              className="p-2 rounded bg-red-950/20 border border-red-500/10 text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                              title="Delete Assignment"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          <div className="p-2 rounded bg-dark-900 border border-dark-800 text-dark-400 group-hover:text-white transition-all">
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TABS 5: CHAT VIEW */}
        {activeSubTab === 'chat' && (
          <section className="animate-fade-in">
            <ChatHelp classroomId={id} />
          </section>
        )}

        {/* TABS 6: DOUBTS FORUM VIEW */}
        {activeSubTab === 'doubts' && (
          <section className="animate-fade-in">
            <DoubtForum classroomId={id} />
          </section>
        )}

        {/* TABS 7: QUIZZES VIEW */}
        {activeSubTab === 'quizzes' && (
          <section className="animate-fade-in">
            <QuizList classroomId={id} />
          </section>
        )}
      </div>

      {/* EDIT CLASSROOM MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl p-6 relative border border-dark-800 animate-slide-up">
            <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <div className="mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600/10 text-primary-400 flex items-center justify-center">
                <Edit2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edit Classroom details</h3>
                <p className="text-xs text-dark-400">Update workspace parameters for enrolled students.</p>
              </div>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Classroom Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Calculus BC - Period 4"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Description</label>
                <textarea
                  required
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Class guidelines, syllabus details, exam schedules..."
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs resize-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 bg-dark-900 border border-dark-800 text-dark-300 font-semibold text-xs rounded-xl hover:bg-dark-850">
                  Cancel
                </button>
                <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-3 bg-gradient-brand text-white font-semibold text-xs rounded-xl hover:shadow-primary-500/10 active:scale-[0.98] transition-all border border-primary-500/25 disabled:opacity-50">
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD STUDY MATERIAL MODAL */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl p-6 relative border border-dark-800 animate-slide-up">
            <button onClick={() => setShowMaterialModal(false)} className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <div className="mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600/10 text-primary-400 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload Study Material</h3>
                <p className="text-xs text-dark-400">Share PDF, DOCX, PPT, or ZIP files with students.</p>
              </div>
            </div>
            <form onSubmit={handleMaterialUploadSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Material Title</label>
                <input
                  type="text"
                  required
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  placeholder="e.g. Unit 3 Worksheet - Integrals"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300">Topic / Module</label>
                  <input
                    type="text"
                    required
                    value={materialForm.topic}
                    onChange={(e) => setMaterialForm({ ...materialForm, topic: e.target.value })}
                    placeholder="e.g. Topic 1, Module A"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300">File Type Limit</label>
                  <span className="text-[10px] text-dark-450 block pt-3 italic leading-none">
                    PDF, DOCX, PPT, ZIP up to 100MB
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Description (Optional)</label>
                <input
                  type="text"
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  placeholder="Add quick notes for students..."
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">File Attachment</label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActive 
                      ? 'border-primary-500 bg-primary-500/5' 
                      : materialForm.file 
                        ? 'border-emerald-500/30 bg-emerald-500/5' 
                        : 'border-dark-800 hover:border-dark-750 bg-dark-950/20'
                  }`}
                >
                  <input
                    type="file"
                    required
                    id="material-file-upload"
                    accept=".pdf,.docx,.doc,.ppt,.pptx,.zip,.rar"
                    onChange={(e) => setMaterialForm({ ...materialForm, file: e.target.files[0] })}
                    className="hidden"
                  />
                  <label htmlFor="material-file-upload" className="cursor-pointer space-y-2 block">
                    <Upload size={22} className={`mx-auto ${materialForm.file ? 'text-emerald-400' : 'text-dark-500'}`} />
                    <div className="text-xs text-dark-300">
                      {materialForm.file ? (
                        <span className="font-semibold text-emerald-400 truncate max-w-[200px] inline-block">
                          {materialForm.file.name}
                        </span>
                      ) : (
                        <span>Drag & drop or <span className="font-semibold text-primary-400 hover:text-primary-300">browse</span></span>
                      )}
                    </div>
                  </label>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowMaterialModal(false)} className="flex-1 py-3 bg-dark-900 border border-dark-800 text-dark-300 font-semibold text-xs rounded-xl hover:bg-dark-850">
                  Cancel
                </button>
                <button type="submit" disabled={uploadMaterialMutation.isPending} className="flex-1 py-3 bg-gradient-brand text-white font-semibold text-xs rounded-xl hover:shadow-primary-500/10 active:scale-[0.98] transition-all border border-primary-500/25 disabled:opacity-50">
                  {uploadMaterialMutation.isPending ? 'Uploading...' : 'Publish Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD VIDEO MODAL */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl p-6 relative border border-dark-800 animate-slide-up">
            <button onClick={() => setShowVideoModal(false)} className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <div className="mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600/10 text-primary-400 flex items-center justify-center">
                <VideoIcon size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload Video Lecture</h3>
                <p className="text-xs text-dark-400">Share video assets or YouTube bookmarks with students.</p>
              </div>
            </div>
            <form onSubmit={handleVideoUploadSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Upload Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVideoForm({ ...videoForm, uploadType: 'file', youtubeUrl: '' })}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      videoForm.uploadType === 'file'
                        ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                        : 'border-dark-800 bg-dark-900/40 text-dark-400 hover:border-dark-700'
                    }`}
                  >
                    Video File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoForm({ ...videoForm, uploadType: 'youtube', file: null })}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      videoForm.uploadType === 'youtube'
                        ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                        : 'border-dark-800 bg-dark-900/40 text-dark-400 hover:border-dark-700'
                    }`}
                  >
                    YouTube Link
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Video Title</label>
                <input
                  type="text"
                  required
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  placeholder="e.g. Unit 3 Lecture - Fundamentals of Integrals"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300">Topic / Module</label>
                  <input
                    type="text"
                    required
                    value={videoForm.topic}
                    onChange={(e) => setVideoForm({ ...videoForm, topic: e.target.value })}
                    placeholder="e.g. Topic 1, Module A"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300">Description (Optional)</label>
                  <input
                    type="text"
                    value={videoForm.description}
                    onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                    placeholder="Brief notes..."
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                  />
                </div>
              </div>
              {videoForm.uploadType === 'file' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300">Video Attachment</label>
                  <div className="relative">
                    <input
                      type="file"
                      required
                      accept="video/mp4,video/webm,video/ogg"
                      onChange={(e) => setVideoForm({ ...videoForm, file: e.target.files[0] })}
                      className="w-full px-4 py-2 rounded-xl glass-input text-white text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300">YouTube URL</label>
                  <input
                    type="url"
                    required
                    value={videoForm.youtubeUrl}
                    onChange={(e) => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })}
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                  />
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowVideoModal(false)} className="flex-1 py-3 bg-dark-900 border border-dark-800 text-dark-300 font-semibold text-xs rounded-xl hover:bg-dark-850">
                  Cancel
                </button>
                <button type="submit" disabled={uploadVideoMutation.isPending} className="flex-1 py-3 bg-gradient-brand text-white font-semibold text-xs rounded-xl hover:shadow-primary-500/10 active:scale-[0.98] transition-all border border-primary-500/25 disabled:opacity-50">
                  {uploadVideoMutation.isPending ? 'Publishing...' : 'Publish Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ASSIGNMENT MODAL */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl p-6 relative border border-dark-800 animate-slide-up">
            <button
              onClick={() => setShowAssignmentModal(false)}
              className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600/10 text-primary-400 flex items-center justify-center">
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create Classroom Assignment</h3>
                <p className="text-xs text-dark-400">Publish homework files, set grades, and set timelines.</p>
              </div>
            </div>

            <form onSubmit={handleAssignmentCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  placeholder="e.g. Homework 3 - Derivatives Review"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300">Deadline Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={assignmentForm.deadline}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, deadline: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300">Maximum Marks</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={assignmentForm.maxMarks}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, maxMarks: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Description / Specifications</label>
                <textarea
                  required
                  rows={4}
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  placeholder="Explain assignment requirements, submission parameters, grading rubric details..."
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs resize-none"
                />
              </div>

              {/* Optional reference sheet attachment */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Reference File (Optional)</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.zip,.rar"
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, file: e.target.files[0] })}
                  className="w-full px-4 py-2 rounded-xl glass-input text-white text-xs"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="flex-1 py-3 bg-dark-900 border border-dark-800 text-dark-300 font-semibold text-xs rounded-xl hover:bg-dark-850"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAssignmentMutation.isPending}
                  className="flex-1 py-3 bg-gradient-brand text-white font-semibold text-xs rounded-xl hover:shadow-primary-500/10 active:scale-[0.98] transition-all border border-primary-500/25 disabled:opacity-50"
                >
                  {createAssignmentMutation.isPending ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF PREVIEW IFRAME MODAL */}
      {previewPdfUrl && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-4xl rounded-2xl shadow-2xl h-[85vh] relative border border-dark-800 animate-slide-up flex flex-col">
            <button onClick={() => setPreviewPdfUrl(null)} className="absolute top-4 right-4 text-dark-400 hover:text-white bg-dark-900 border border-dark-800 p-2 rounded-full transition-colors z-20" title="Close Preview">
              <X size={16} />
            </button>
            <div className="p-4 border-b border-dark-800 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText size={16} className="text-red-500" />
                Document Viewer Preview
              </h3>
            </div>
            <iframe src={previewPdfUrl} className="w-full h-full border-none rounded-b-2xl bg-white" title="PDF Reader" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomDetails;
