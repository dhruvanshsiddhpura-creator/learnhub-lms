import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  useClassroomsQuery,
  useCreateClassroomMutation,
  useDeleteClassroomMutation,
  useJoinClassroomMutation,
  useLeaveClassroomMutation
} from '../api/classroomApi';
import {
  BookOpen,
  GraduationCap,
  Award,
  Clock,
  Plus,
  LogOut,
  Users,
  Layers,
  Sparkles,
  Search,
  BookMarked,
  Grid,
  CheckCircle,
  HelpCircle,
  FileText,
  User,
  X,
  Link2,
  Unlink,
  Settings,
  School,
  Copy,
  Check,
  ChevronRight,
  Trash2,
  Activity,
  Sun,
  Moon,
  Shield,
  Bell
} from 'lucide-react';
import AdminPanel from './AdminPanel';
import TeacherAnalytics from '../components/TeacherAnalytics';
import StudentAnalytics from '../components/StudentAnalytics';
import { useToast } from '../components/Toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, disconnectProvider, refreshProfile, api } = useAuth();
  
  // Dashboard Core states
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    enrolledCount: 0,
    categoryCount: 0,
    studyHours: 0,
    completedCount: 0,
    coursesCount: 0,
    studentCount: 0,
    rating: 0,
    teachingHours: 0,
    teacherCount: 0,
    courseCount: 0,
    activeSessions: 0
  });
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses'); // courses, explore, classrooms, profile
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / Forms
  const [showCourseCreateModal, setShowCourseCreateModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', category: '', banner: '' });
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Classroom Modals / Forms
  const [showClassroomCreateModal, setShowClassroomCreateModal] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // React Query for Classrooms
  const { data: classrooms, isLoading: classroomsLoading, error: classroomsError } = useClassroomsQuery();
  const createClassroomMutation = useCreateClassroomMutation();
  const deleteClassroomMutation = useDeleteClassroomMutation();
  const joinClassroomMutation = useJoinClassroomMutation();
  const leaveClassroomMutation = useLeaveClassroomMutation();

  // Action loaders / alert
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const { addToast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const triggerAlert = (message, type = 'success') => {
    addToast(message, type);
  };

  // Intercept connection query parameters from OAuth redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectStatus = params.get('connect_status');
    const connectMessage = params.get('message');

    if (connectStatus === 'success') {
      triggerAlert('Account linked successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
      refreshProfile();
    } else if (connectStatus === 'error') {
      triggerAlert(connectMessage || 'Failed to connect account.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refreshProfile]);

  // Fetch all courses and stats based on role
  const fetchCourseData = async () => {
    if (activeTab === 'profile' || activeTab === 'classrooms') {
      setCoursesLoading(false);
      return;
    }

    setCoursesLoading(true);
    try {
      let coursesUrl = '/courses';
      if (user.role === 'TEACHER' && activeTab === 'courses') {
        coursesUrl = '/courses?mine=true';
      } else if (user.role === 'STUDENT' && activeTab === 'courses') {
        coursesUrl = '/courses?enrolled=true';
      }
      
      const coursesRes = await api.get(coursesUrl);
      setCourses(coursesRes.data);

      const statsRes = await api.get('/courses/stats');
      setStats((prev) => ({ ...prev, ...statsRes.data }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      triggerAlert('Failed to sync workspace data', 'error');
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [activeTab]);

  // Handle Copy Join Code
  const handleCopyCode = (e, classroomId, code) => {
    e.stopPropagation(); // prevent card click redirect
    navigator.clipboard.writeText(code);
    setCopiedId(classroomId);
    setTimeout(() => setCopiedId(null), 2000);
    triggerAlert('Classroom code copied!');
  };

  // Handle Enrollment in courses
  const handleCourseEnroll = async (courseId) => {
    setActionLoadingId(courseId);
    try {
      await api.post(`/courses/${courseId}/enroll`);
      triggerAlert('Successfully enrolled in course!');
      fetchCourseData();
    } catch (error) {
      console.error(error);
      triggerAlert(error.response?.data?.message || 'Failed to enroll', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCourseUnenroll = async (courseId) => {
    if (!window.confirm('Are you sure you want to unenroll?')) return;
    setActionLoadingId(courseId);
    try {
      await api.delete(`/courses/${courseId}/unenroll`);
      triggerAlert('Successfully unenrolled from course');
      fetchCourseData();
    } catch (error) {
      console.error(error);
      triggerAlert(error.response?.data?.message || 'Failed to unenroll', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCourseCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.post('/courses', newCourse);
      triggerAlert('Course created successfully!');
      setShowCourseCreateModal(false);
      setNewCourse({ title: '', description: '', category: '', banner: '' });
      fetchCourseData();
    } catch (error) {
      console.error(error);
      triggerAlert(error.response?.data?.message || 'Failed to create course', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Classroom Creation
  const handleClassroomCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await createClassroomMutation.mutateAsync(newClassroom);
      triggerAlert('Classroom created successfully!');
      setShowClassroomCreateModal(false);
      setNewClassroom({ name: '', description: '' });
    } catch (error) {
      console.error(error);
      triggerAlert(error.response?.data?.message || 'Failed to create classroom', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Classroom Join
  const handleClassroomJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    setCreateLoading(true);
    try {
      await joinClassroomMutation.mutateAsync(joinCode);
      triggerAlert('Successfully joined classroom!');
      setJoinCode('');
    } catch (error) {
      console.error(error);
      triggerAlert(error.response?.data?.message || 'Invalid classroom code', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Classroom Delete
  const handleClassroomDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this classroom?')) return;
    try {
      await deleteClassroomMutation.mutateAsync(id);
      triggerAlert('Classroom deleted successfully.');
    } catch (error) {
      console.error(error);
      triggerAlert('Failed to delete classroom', 'error');
    }
  };

  // Handle Classroom Leave
  const handleClassroomLeave = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to leave this classroom?')) return;
    try {
      await leaveClassroomMutation.mutateAsync(id);
      triggerAlert('Successfully left classroom.');
    } catch (error) {
      console.error(error);
      triggerAlert('Failed to leave classroom', 'error');
    }
  };

  // Handle Connecting an Account
  const handleConnectProvider = (provider) => {
    triggerAlert(`Redirecting to connect ${provider}...`);
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${baseUrl}/auth/connect/${provider}?token=${localStorage.getItem('token')}`;
  };

  // Handle Disconnecting an Account
  const handleDisconnectProvider = async (provider) => {
    if (!window.confirm(`Are you sure you want to unlink your ${provider} account?`)) return;
    const res = await disconnectProvider(provider);
    if (res.success) {
      triggerAlert(`Successfully disconnected your ${provider} account.`);
    } else {
      triggerAlert(res.message, 'error');
    }
  };

  // Filters
  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClassrooms = (classrooms || []).filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-dark-950 text-dark-50' : 'bg-gray-50 text-gray-900'}`}>
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-dark-900 border-r border-dark-800/80 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-6 space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-md">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Learn</h2>
              <span className="text-[10px] text-primary-400 font-bold uppercase tracking-widest">Hub LMS</span>
            </div>
          </div>

          {/* Profile Card */}
          <div className="p-4 rounded-xl bg-dark-950/50 border border-dark-800 flex items-center gap-3">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full border border-primary-500/20"
            />
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-white truncate leading-snug">{user.name}</h4>
              <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                user.role === 'ADMIN' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                user.role === 'TEACHER' ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400' :
                'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              }`}>
                {user.role}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <span className="block text-[10px] font-bold text-dark-500 uppercase tracking-widest px-3 mb-2">Workspace</span>
            
            {/* Student tabs */}
            {user.role === 'STUDENT' && (
              <>
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'courses'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
                  }`}
                >
                  <BookMarked size={18} />
                  My Classroom
                </button>
                <button
                  onClick={() => setActiveTab('classrooms')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'classrooms'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
                  }`}
                >
                  <School size={18} />
                  My Classrooms
                </button>
                <button
                  onClick={() => setActiveTab('explore')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'explore'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
                  }`}
                >
                  <Search size={18} />
                  Explore Catalog
                </button>
              </>
            )}

            {/* Teacher tabs */}
            {user.role === 'TEACHER' && (
              <>
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'courses'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
                  }`}
                >
                  <BookOpen size={18} />
                  Taught Courses
                </button>
                <button
                  onClick={() => setActiveTab('classrooms')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'classrooms'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
                  }`}
                >
                  <School size={18} />
                  My Classrooms
                </button>
                <button
                  onClick={() => setActiveTab('explore')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'explore'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
                  }`}
                >
                  <Grid size={18} />
                  Explore Courses
                </button>
              </>
            )}

            {/* Admin tabs */}
            {user.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'admin'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
                  }`}
                >
                  <Shield size={18} />
                  Admin Panel
                </button>
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'courses'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
                  }`}
                >
                  <Layers size={18} />
                  Manage Courses
                </button>
                <button
                  onClick={() => setActiveTab('classrooms')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'classrooms'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
                  }`}
                >
                  <School size={18} />
                  Manage Classrooms
                </button>
              </>
            )}

            {/* Analytics tab (For Students and Teachers) */}
            {(user.role === 'STUDENT' || user.role === 'TEACHER') && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-primary-600 text-white'
                    : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
                }`}
              >
                <Activity size={18} />
                Analytics
              </button>
            )}

            {/* Common profile settings tab */}
            <span className="block text-[10px] font-bold text-dark-500 uppercase tracking-widest px-3 mt-4 mb-2">Account Settings</span>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-primary-600 text-white'
                  : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
              }`}
            >
              <User size={18} />
              Profile & Accounts
            </button>
          </nav>
        </div>

        {/* Footer Settings */}
        <div className="p-6 border-t border-dark-800/80 space-y-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-dark-400 hover:bg-dark-800/40 transition-all hover:text-white"
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
              Theme
            </div>
            <div className="w-8 h-4 rounded-full bg-dark-700 relative">
              <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${isDarkMode ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </button>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all hover:text-red-300"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 min-h-screen overflow-y-auto flex flex-col">
        {/* HEADER */}
        <header className="p-6 border-b border-dark-800/80 flex justify-between items-center bg-dark-900/40 backdrop-blur-sm sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Welcome back, {user.name.split(' ')[0]} <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-xs text-dark-400 mt-1">
              {activeTab === 'profile' && "Manage your login details and connected social providers."}
              {activeTab === 'classrooms' && "Access, discover, and administrate physical/digital classrooms."}
              {activeTab !== 'profile' && activeTab !== 'classrooms' && user.role === 'STUDENT' && "Learn and build skills with specialized coursework."}
              {activeTab !== 'profile' && activeTab !== 'classrooms' && user.role === 'TEACHER' && "Create coursework, host modules, and review student enrollments."}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            {activeTab !== 'profile' && activeTab !== 'admin' && activeTab !== 'analytics' && (
              <div className="relative hidden sm:block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  placeholder={activeTab === 'classrooms' ? "Search classrooms..." : "Search courses..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-52 focus:w-64 rounded-xl text-xs glass-input text-white transition-all"
                />
              </div>
            )}
            
            {/* Action buttons based on Role & Active Tab */}
            {user.role === 'TEACHER' && activeTab === 'courses' && (
              <button
                onClick={() => setShowCourseCreateModal(true)}
                className="bg-primary-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-500/15 flex items-center gap-1.5 transition-all"
              >
                <Plus size={16} />
                Create Course
              </button>
            )}
            {user.role === 'TEACHER' && activeTab === 'classrooms' && (
              <button
                onClick={() => setShowClassroomCreateModal(true)}
                className="bg-primary-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-500/15 flex items-center gap-1.5 transition-all"
              >
                <Plus size={16} />
                Create Classroom
              </button>
            )}

            {/* Mobile Log Out icon */}
            <button
              onClick={logout}
              className="p-2.5 rounded-xl bg-dark-900 border border-dark-800 text-dark-400 hover:text-red-400 md:hidden transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <div className="p-6 space-y-8 flex-1 max-w-7xl w-full mx-auto">
          {/* Mobile quick tab select (under md screen) */}
          <div className="flex md:hidden flex-wrap gap-2 bg-dark-900/60 p-1.5 rounded-xl border border-dark-850">
            <button
              onClick={() => setActiveTab('courses')}
              className={`flex-1 min-w-[80px] py-2 text-center text-xs font-semibold rounded-lg ${activeTab === 'courses' ? 'bg-primary-600 text-white' : 'text-dark-400'}`}
            >
              Courses
            </button>
            <button
              onClick={() => setActiveTab('classrooms')}
              className={`flex-1 min-w-[80px] py-2 text-center text-xs font-semibold rounded-lg ${activeTab === 'classrooms' ? 'bg-primary-600 text-white' : 'text-dark-400'}`}
            >
              Classrooms
            </button>
            {(user.role === 'STUDENT' || user.role === 'TEACHER') && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 min-w-[80px] py-2 text-center text-xs font-semibold rounded-lg ${activeTab === 'analytics' ? 'bg-primary-600 text-white' : 'text-dark-400'}`}
              >
                Stats
              </button>
            )}
            {user.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-1 min-w-[80px] py-2 text-center text-xs font-semibold rounded-lg ${activeTab === 'admin' ? 'bg-primary-600 text-white' : 'text-dark-400'}`}
              >
                Admin
              </button>
            )}
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 min-w-[80px] py-2 text-center text-xs font-semibold rounded-lg ${activeTab === 'profile' ? 'bg-primary-600 text-white' : 'text-dark-400'}`}
            >
              Settings
            </button>
          </div>

          {/* ADMIN TAB */}
          {activeTab === 'admin' && user.role === 'ADMIN' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <h2 className="text-2xl font-black text-white">Admin Control Center</h2>
              <AdminPanel />
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <h2 className="text-2xl font-black text-white">Platform Analytics</h2>
              {user.role === 'TEACHER' ? <TeacherAnalytics /> : <StudentAnalytics />}
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-slide-up">
              {/* Profile details */}
              <div className="glass-panel p-6 rounded-2xl border border-dark-800 space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <User size={20} className="text-primary-400" />
                  Personal Workspace Profile
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-dark-950/40 border border-dark-850">
                  <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full border-2 border-primary-500/20" />
                  <div className="text-center sm:text-left space-y-1.5 flex-1">
                    <h4 className="text-xl font-bold text-white">{user.name}</h4>
                    <p className="text-xs text-dark-400">{user.email}</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-300 uppercase tracking-wider">
                        {user.role} Account
                      </span>
                      <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-dark-800 text-dark-400">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Login Connection Map */}
              <div className="glass-panel p-6 rounded-2xl border border-dark-800 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Connected Accounts</h3>
                  <p className="text-xs text-dark-400 mt-1">
                    Link your social accounts to log in securely with OAuth.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Google */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-950/40 border border-dark-850">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-dark-750">
                        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">Google Account</h5>
                        <span className="text-[10px] font-medium text-dark-400">
                          {user.googleId ? "Connected" : "Not connected"}
                        </span>
                      </div>
                    </div>
                    {user.googleId ? (
                      <button
                        onClick={() => handleDisconnectProvider('google')}
                        className="px-3.5 py-1.5 bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-950/40 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectProvider('google')}
                        className="px-3.5 py-1.5 bg-dark-900 border border-dark-750 text-dark-200 hover:bg-dark-850 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>

                  {/* GitHub */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-950/40 border border-dark-850">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-dark-750">
                        <svg fill="#FFFFFF" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">GitHub Account</h5>
                        <span className="text-[10px] font-medium text-dark-400">
                          {user.githubId ? "Connected" : "Not connected"}
                        </span>
                      </div>
                    </div>
                    {user.githubId ? (
                      <button
                        onClick={() => handleDisconnectProvider('github')}
                        className="px-3.5 py-1.5 bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-950/40 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectProvider('github')}
                        className="px-3.5 py-1.5 bg-dark-900 border border-dark-750 text-dark-200 hover:bg-dark-850 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>

                  {/* Facebook */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-950/40 border border-dark-850">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-dark-750">
                        <svg fill="#1877F2" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">Facebook Account</h5>
                        <span className="text-[10px] font-medium text-dark-400">
                          {user.facebookId ? "Connected" : "Not connected"}
                        </span>
                      </div>
                    </div>
                    {user.facebookId ? (
                      <button
                        onClick={() => handleDisconnectProvider('facebook')}
                        className="px-3.5 py-1.5 bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-950/40 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectProvider('facebook')}
                        className="px-3.5 py-1.5 bg-dark-900 border border-dark-750 text-dark-200 hover:bg-dark-850 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLASSROOMS TAB */}
          {activeTab === 'classrooms' && (
            <div className="space-y-6 animate-slide-up">
              {/* Student join form card */}
              {user.role === 'STUDENT' && (
                <div className="glass-panel p-5 rounded-2xl border border-dark-800 max-w-xl">
                  <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <School size={16} className="text-primary-400" /> Join a Classroom
                  </h4>
                  <p className="text-xs text-dark-400 mb-4 leading-normal">
                    Enter the unique 6-character code provided by your teacher to access their classroom workspace.
                  </p>
                  <form onSubmit={handleClassroomJoinSubmit} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="e.g. C3F9X2"
                      className="px-4 py-2.5 rounded-xl glass-input text-white text-sm font-mono tracking-wider w-40 uppercase"
                    />
                    <button
                      type="submit"
                      disabled={joinClassroomMutation.isPending}
                      className="bg-primary-600 text-white font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {joinClassroomMutation.isPending ? 'Joining...' : 'Join Classroom'}
                    </button>
                  </form>
                </div>
              )}

              {/* Title Section */}
              <div className="flex justify-between items-center border-b border-dark-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <School size={18} className="text-primary-400" />
                  {user.role === 'TEACHER' ? 'Managed Classrooms' : 'Enrolled Classrooms'}
                  <span className="px-2 py-0.5 rounded bg-dark-800 text-[10px] text-dark-300 font-bold">
                    {filteredClassrooms.length}
                  </span>
                </h3>
              </div>

              {/* Classrooms Grid */}
              {classroomsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2].map((n) => (
                    <div key={n} className="glass-card rounded-2xl h-44 p-5 animate-pulse-subtle flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="h-5 bg-dark-800 rounded w-1/2" />
                        <div className="h-10 bg-dark-850 rounded w-full" />
                      </div>
                      <div className="h-10 bg-dark-800 rounded-xl w-full" />
                    </div>
                  ))}
                </div>
              ) : filteredClassrooms.length === 0 ? (
                <div className="glass-panel p-16 rounded-2xl text-center space-y-4 max-w-xl mx-auto border border-dashed border-dark-750">
                  <div className="w-16 h-16 rounded-full bg-dark-900 flex items-center justify-center mx-auto text-dark-500">
                    <School size={28} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white">No classrooms found</h4>
                    <p className="text-sm text-dark-400 leading-relaxed">
                      {user.role === 'STUDENT'
                        ? "You haven't joined any classrooms yet. Enter a teacher code above to join one."
                        : "You haven't created any classrooms yet. Click 'Create Classroom' at the top right to start."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClassrooms.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => navigate(`/classroom/${cls.id}`)}
                      className="glass-card rounded-2xl p-5 border border-dark-800/80 hover:border-primary-500/40 cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden group shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-lg font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                            {cls.name}
                          </h4>
                          
                          {/* Teacher delete button */}
                          {user.role === 'TEACHER' && (
                            <button
                              onClick={(e) => handleClassroomDelete(e, cls.id)}
                              className="p-1 rounded bg-red-950/20 border border-red-500/10 text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                              title="Delete Classroom"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-dark-400 leading-normal line-clamp-2">
                          {cls.description}
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-dark-800/60 z-10 relative">
                        {/* Student Count / Teacher details */}
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-dark-400 font-semibold flex items-center gap-1">
                            <Users size={12} />
                            {cls.studentCount || 0} enrolled
                          </span>

                          {user.role === 'STUDENT' && (
                            <div className="flex items-center gap-1.5">
                              <img src={cls.teacher.avatar} alt={cls.teacher.name} className="w-5 h-5 rounded-full border border-dark-750" />
                              <span className="text-[10px] font-semibold text-dark-300 truncate max-w-[80px]">{cls.teacher.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Join Code Copy or Leave trigger */}
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => navigate(`/classroom/${cls.id}`)}
                            className="flex-1 py-1.5 bg-dark-900 hover:bg-dark-850 border border-dark-800 text-dark-200 font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            Open Details
                            <ChevronRight size={12} />
                          </button>
                          
                          {user.role === 'TEACHER' && (
                            <button
                              onClick={(e) => handleCopyCode(e, cls.id, cls.code)}
                              className="px-2.5 py-1.5 bg-dark-900 border border-dark-800 rounded-lg text-dark-400 hover:text-white flex items-center justify-center gap-1 text-[10px] font-semibold"
                              title="Copy Class Code"
                            >
                              {copiedId === cls.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              <span className="font-mono text-white font-bold">{cls.code}</span>
                            </button>
                          )}

                          {user.role === 'STUDENT' && (
                            <button
                              onClick={(e) => handleClassroomLeave(e, cls.id)}
                              className="px-2.5 py-1.5 bg-red-950/10 border border-red-500/20 text-red-400 hover:bg-red-950/30 rounded-lg text-[10px] font-bold"
                            >
                              Leave
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COURSES & EXPLORE TABS (Standard views) */}
          {activeTab !== 'profile' && activeTab !== 'classrooms' && activeTab !== 'admin' && activeTab !== 'analytics' && (
            <>
              {/* STATS GRID SECTION */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
                {user.role === 'STUDENT' && (
                  <>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-violet-500/10 text-violet-400">
                        <BookMarked size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">Enrolled Classes</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.enrolledCount}</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-violet-400 pointer-events-none"><BookMarked size={80} /></div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <Clock size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">Study Hours</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.studyHours}h</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-cyan-400 pointer-events-none"><Clock size={80} /></div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Award size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">Completed</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.completedCount}</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-emerald-400 pointer-events-none"><Award size={80} /></div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400">
                        <Layers size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">Categories</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.categoryCount}</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-amber-400 pointer-events-none"><Layers size={80} /></div>
                    </div>
                  </>
                )}

                {user.role === 'TEACHER' && (
                  <>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-violet-500/10 text-violet-400">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">My Courses</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.coursesCount}</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-violet-400 pointer-events-none"><BookOpen size={80} /></div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <Users size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">Total Students</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.studentCount}</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-cyan-400 pointer-events-none"><Users size={80} /></div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">Feedback Rating</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.rating} ★</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-amber-400 pointer-events-none"><Sparkles size={80} /></div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Clock size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">Teaching Hours</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.teachingHours}h</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-emerald-400 pointer-events-none"><Clock size={80} /></div>
                    </div>
                  </>
                )}

                {user.role === 'ADMIN' && (
                  <>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-violet-500/10 text-violet-400">
                        <Layers size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">System Courses</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.courseCount}</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-violet-400 pointer-events-none"><Layers size={80} /></div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <Users size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">System Students</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.studentCount}</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-cyan-400 pointer-events-none"><Users size={80} /></div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400">
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">System Teachers</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.teacherCount}</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-amber-400 pointer-events-none"><GraduationCap size={80} /></div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">Active Sessions</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">{coursesLoading ? '...' : stats.activeSessions}</span>
                      </div>
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-emerald-400 pointer-events-none"><Sparkles size={80} /></div>
                    </div>
                  </>
                )}
              </section>

              {/* COURSE CONTENT CONTAINER */}
              <section className="space-y-6">
                <div className="flex justify-between items-center border-b border-dark-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-primary-400" />
                    {activeTab === 'courses' ? 'My Core Courses' : 'Available Catalog'}
                    <span className="px-2 py-0.5 rounded bg-dark-800 text-[10px] text-dark-300 font-bold">
                      {filteredCourses.length}
                    </span>
                  </h3>
                  
                  {/* Page Catalog toggles */}
                  <div className="hidden md:flex gap-1.5 bg-dark-900/40 p-1 rounded-xl border border-dark-850">
                    <button
                      onClick={() => setActiveTab('courses')}
                      className={`px-4.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'courses' ? 'bg-dark-800 text-white border border-dark-750' : 'text-dark-400 hover:text-white'
                      }`}
                    >
                      {user.role === 'TEACHER' ? 'Created Courses' : user.role === 'ADMIN' ? 'All System' : 'Enrolled'}
                    </button>
                    {user.role !== 'ADMIN' && (
                      <button
                        onClick={() => setActiveTab('explore')}
                        className={`px-4.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          activeTab === 'explore' ? 'bg-dark-800 text-white border border-dark-750' : 'text-dark-400 hover:text-white'
                        }`}
                      >
                        Explore Catalog
                      </button>
                    )}
                  </div>
                </div>

                {/* Loading Grid Skeleton */}
                {coursesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="glass-card rounded-2xl h-80 overflow-hidden flex flex-col justify-between p-4 animate-pulse-subtle">
                        <div className="w-full h-32 rounded-xl bg-dark-800" />
                        <div className="space-y-3 mt-4 flex-1">
                          <div className="h-4 bg-dark-800 rounded w-1/3" />
                          <div className="h-6 bg-dark-850 rounded w-3/4" />
                          <div className="h-10 bg-dark-850 rounded w-full" />
                        </div>
                        <div className="h-10 bg-dark-800 rounded-xl w-full mt-4" />
                      </div>
                    ))}
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <div className="glass-panel p-16 rounded-2xl text-center space-y-4 max-w-xl mx-auto border border-dashed border-dark-750">
                    <div className="w-16 h-16 rounded-full bg-dark-900 flex items-center justify-center mx-auto text-dark-500">
                      <BookOpen size={28} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-white">No courses found</h4>
                      <p className="text-sm text-dark-400 leading-relaxed">
                        {activeTab === 'courses'
                          ? "You haven't enrolled or created any classes yet. Try visiting the Explore Catalog!"
                          : "No classes match your keyword search. Try another spelling or category."}
                      </p>
                    </div>
                    {activeTab === 'courses' && user.role === 'STUDENT' && (
                      <button
                        onClick={() => setActiveTab('explore')}
                        className="px-5 py-2.5 bg-primary-600 font-semibold text-xs rounded-xl hover:bg-primary-700 transition-colors text-white"
                      >
                        Browse Catalog
                      </button>
                    )}
                  </div>
                ) : (
                  // Course Cards Grid
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                      <div key={course.id} className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg h-full border border-dark-800/80">
                        <div>
                          {/* Course Banner */}
                          <div className="h-36 relative overflow-hidden">
                            <img
                              src={course.banner}
                              alt={course.title}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/20 to-transparent" />
                            <span className="absolute top-3 left-3 px-2.5 py-1 text-[9px] font-extrabold uppercase bg-primary-600 text-white rounded-lg tracking-wider">
                              {course.category}
                            </span>
                          </div>

                          {/* Course details */}
                          <div className="p-5 space-y-3">
                            <h4 className="text-lg font-bold text-white tracking-tight leading-snug line-clamp-1">
                              {course.title}
                            </h4>
                            <p className="text-xs text-dark-400 leading-relaxed line-clamp-3">
                              {course.description}
                            </p>
                          </div>
                        </div>

                        <div className="p-5 pt-0 space-y-4">
                          <div className="flex items-center justify-between border-t border-dark-800/60 pt-4">
                            <div className="flex items-center gap-2">
                              <img
                                src={course.instructor.avatar}
                                alt={course.instructor.name}
                                className="w-6 h-6 rounded-full border border-dark-750"
                              />
                              <span className="text-[11px] font-semibold text-dark-300 truncate max-w-[100px]">
                                {course.instructor.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-dark-400 font-medium flex items-center gap-1">
                              <Users size={12} />
                              {course.enrollmentCount || 0} students
                            </span>
                          </div>

                          {/* Card actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedCourse(course)}
                              className="flex-1 py-2.5 bg-dark-900 border border-dark-800 text-dark-200 font-semibold text-xs rounded-xl hover:bg-dark-850 transition-colors"
                            >
                              View Details
                            </button>

                            {user.role === 'STUDENT' && (
                              course.isEnrolled ? (
                                <button
                                  onClick={() => handleCourseUnenroll(course.id)}
                                  disabled={actionLoadingId === course.id}
                                  className="flex-1 py-2.5 bg-red-950/20 border border-red-500/30 text-red-400 font-semibold text-xs rounded-xl hover:bg-red-950/40 transition-colors disabled:opacity-50"
                                >
                                  {actionLoadingId === course.id ? 'Saving...' : 'Unenroll'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCourseEnroll(course.id)}
                                  disabled={actionLoadingId === course.id}
                                  className="flex-1 py-2.5 bg-primary-600 text-white font-semibold text-xs rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                                >
                                  {actionLoadingId === course.id ? 'Enrolling...' : 'Enroll Now'}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {/* CREATE COURSE MODAL */}
      {showCourseCreateModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl p-6 relative border border-dark-800 animate-slide-up">
            <button
              onClick={() => setShowCourseCreateModal(false)}
              className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600/10 text-primary-400 flex items-center justify-center">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create Course Syllabus</h3>
                <p className="text-xs text-dark-400">Launch a new modular workspace for enrollments.</p>
              </div>
            </div>

            <form onSubmit={handleCourseCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Course Title</label>
                <input
                  type="text"
                  required
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  placeholder="e.g. Introduction to Advanced Machine Learning"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300">Category</label>
                  <input
                    type="text"
                    required
                    value={newCourse.category}
                    onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                    placeholder="e.g. Design, Data Science, Math"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300">Banner Image URL (Optional)</label>
                  <input
                    type="url"
                    value={newCourse.banner}
                    onChange={(e) => setNewCourse({ ...newCourse, banner: e.target.value })}
                    placeholder="e.g. https://images.unsplash.com..."
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Description</label>
                <textarea
                  required
                  rows={4}
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  placeholder="Write a clear syllabus description containing course requirements, learning outcomes, and outline..."
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCourseCreateModal(false)}
                  className="flex-1 py-3 bg-dark-900 border border-dark-800 text-dark-300 font-semibold text-xs rounded-xl hover:bg-dark-850"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-3 bg-gradient-brand text-white font-semibold text-xs rounded-xl hover:shadow-primary-500/10 active:scale-[0.98] transition-all border border-primary-500/25 disabled:opacity-50"
                >
                  {createLoading ? 'Publishing...' : 'Publish Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CLASSROOM MODAL */}
      {showClassroomCreateModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl p-6 relative border border-dark-800 animate-slide-up">
            <button
              onClick={() => setShowClassroomCreateModal(false)}
              className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600/10 text-primary-400 flex items-center justify-center">
                <School size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create New Classroom</h3>
                <p className="text-xs text-dark-400">Set up a physical/virtual classroom list with join codes.</p>
              </div>
            </div>

            <form onSubmit={handleClassroomCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Classroom Name</label>
                <input
                  type="text"
                  required
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  placeholder="e.g. Mathematics II - Algebra Section"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Description</label>
                <textarea
                  required
                  rows={4}
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
                  placeholder="Provide syllabus codes, schedule instructions, exam details..."
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowClassroomCreateModal(false)}
                  className="flex-1 py-3 bg-dark-900 border border-dark-800 text-dark-300 font-semibold text-xs rounded-xl hover:bg-dark-850"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClassroomMutation.isPending}
                  className="flex-1 py-3 bg-gradient-brand text-white font-semibold text-xs rounded-xl hover:shadow-primary-500/10 active:scale-[0.98] transition-all border border-primary-500/25 disabled:opacity-50"
                >
                  {createClassroomMutation.isPending ? 'Creating...' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (Available to all roles) */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative border border-dark-800 animate-slide-up flex flex-col max-h-[85vh]">
            <button
              onClick={() => setSelectedCourse(null)}
              className="absolute top-4 right-4 text-white bg-dark-950/60 p-2 rounded-full hover:bg-dark-950 transition-colors z-20"
            >
              <X size={16} />
            </button>

            <div className="h-48 relative shrink-0">
              <img
                src={selectedCourse.banner}
                alt={selectedCourse.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/40 to-transparent" />
              <div className="absolute bottom-5 left-6 space-y-2">
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-primary-600 text-white rounded-lg tracking-wider">
                  {selectedCourse.category}
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">{selectedCourse.title}</h3>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-center bg-dark-900/60 p-4 rounded-xl border border-dark-800/60">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedCourse.instructor.avatar}
                    alt={selectedCourse.instructor.name}
                    className="w-10 h-10 rounded-full border border-primary-500/20"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-dark-400 uppercase tracking-widest leading-none mb-1">Instructor</h5>
                    <span className="text-sm font-bold text-white">{selectedCourse.instructor.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-dark-400 uppercase tracking-widest leading-none mb-1 block">Students</span>
                  <span className="text-sm font-bold text-white">{selectedCourse.enrollmentCount || 0} Enrolled</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Syllabus Overview</h4>
                <p className="text-xs text-dark-300 leading-relaxed whitespace-pre-wrap">{selectedCourse.description}</p>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Curriculum Modules</h4>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-950/40 border border-dark-850">
                    <span className="px-2 py-0.5 rounded bg-primary-950 border border-primary-900 text-primary-400 font-extrabold text-[9px] mt-0.5">M1</span>
                    <div>
                      <h6 className="text-xs font-bold text-white">Course Orientation & Fundamental Concepts</h6>
                      <p className="text-[10px] text-dark-400 mt-0.5">Overview of course schedule, prerequisites, tool stacks, and initial assessments.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-950/40 border border-dark-850">
                    <span className="px-2 py-0.5 rounded bg-primary-950 border border-primary-900 text-primary-400 font-extrabold text-[9px] mt-0.5">M2</span>
                    <div>
                      <h6 className="text-xs font-bold text-white">Core Structures, Implementation & Labs</h6>
                      <p className="text-[10px] text-dark-400 mt-0.5">Hands-on tutorials, architecture details, and writing code scripts under sandbox environments.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-950/40 border border-dark-850">
                    <span className="px-2 py-0.5 rounded bg-primary-950 border border-primary-900 text-primary-400 font-extrabold text-[9px] mt-0.5">M3</span>
                    <div>
                      <h6 className="text-xs font-bold text-white">Final Capstone Project & Certificate Delivery</h6>
                      <p className="text-[10px] text-dark-400 mt-0.5">Design reviews, implementation audits, deployment validation, and certificate release.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-dark-800/80 bg-dark-900/20 shrink-0 flex gap-3">
              <button
                onClick={() => setSelectedCourse(null)}
                className="flex-1 py-3 bg-dark-900 border border-dark-800 text-dark-300 font-semibold text-xs rounded-xl hover:bg-dark-850"
              >
                Close Window
              </button>

              {user.role === 'STUDENT' && (
                selectedCourse.isEnrolled ? (
                  <button
                    onClick={() => {
                      const id = selectedCourse.id;
                      setSelectedCourse(null);
                      handleCourseUnenroll(id);
                    }}
                    className="flex-1 py-3 bg-red-950/20 border border-red-500/30 text-red-400 font-semibold text-xs rounded-xl hover:bg-red-950/40"
                  >
                    Unenroll from Course
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const id = selectedCourse.id;
                      setSelectedCourse(null);
                      handleCourseEnroll(id);
                    }}
                    className="flex-1 py-3 bg-primary-600 text-white font-semibold text-xs rounded-xl hover:bg-primary-700"
                  >
                    Enroll in Course
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
