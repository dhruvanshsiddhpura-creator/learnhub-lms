import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  useQuizzesQuery,
  useCreateQuizMutation,
  useDeleteQuizMutation,
  useUpdateQuizMutation
} from '../api/classroomApi';
import {
  Plus, Trash2, Edit2, Clock, Trophy, BookOpen, CheckCircle,
  XCircle, Eye, EyeOff, Loader2, Target, ChevronRight, Lock, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QuizCard = ({ quiz, classroomId, isTeacher, onEdit, onDelete, onPublishToggle }) => {
  const navigate = useNavigate();
  const attempt = quiz.attempts?.[0];
  const hasAttempted = attempt?.submittedAt;

  const statusBadge = () => {
    if (!isTeacher) {
      if (hasAttempted) {
        return attempt.isPassed
          ? { label: `Passed · ${Math.round(attempt.score)}%`, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
          : { label: `Failed · ${Math.round(attempt.score)}%`, cls: 'bg-red-100 text-red-700 border-red-200' };
      }
      return { label: 'Not Attempted', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return quiz.isPublished
      ? { label: 'Published', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
      : { label: 'Draft', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  const badge = statusBadge();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer overflow-hidden"
      onClick={() => navigate(`/classroom/${classroomId}/quiz/${quiz.id}`)}
    >
      {/* Background gradient accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
            {quiz.title}
          </h3>
          {quiz.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{quiz.description}</p>
          )}
        </div>

        {isTeacher && (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onPublishToggle(quiz)}
              className={`p-2 rounded-lg transition-colors ${quiz.isPublished ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
              title={quiz.isPublished ? 'Unpublish' : 'Publish'}
            >
              {quiz.isPublished ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
            <button onClick={() => onEdit(quiz)} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(quiz.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-5 text-xs text-gray-500 font-medium">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          {quiz._count?.questions || 0} Questions
        </div>
        {quiz.timeLimit && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            {quiz.timeLimit} min
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Target className="w-4 h-4 text-purple-400" />
          Pass: {quiz.passingScore}%
        </div>
        {isTeacher && (
          <div className="ml-auto flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-indigo-400" />
            {quiz._count?.attempts || 0} Attempts
          </div>
        )}
        {!isTeacher && (
          <div className="ml-auto">
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

const QuizList = ({ classroomId }) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', timeLimit: '', passingScore: 50, shuffleQuestions: false });

  const { data: quizzes, isLoading } = useQuizzesQuery(classroomId);
  const createMutation = useCreateQuizMutation(classroomId);
  const deleteMutation = useDeleteQuizMutation(classroomId);
  const [publishingId, setPublishingId] = useState(null);

  // We need a per-quiz update mutation; handle by calling api directly via a shared mutation
  const genericUpdateMutation = useUpdateQuizMutation(classroomId, publishingId);

  const resetForm = () => {
    setForm({ title: '', description: '', timeLimit: '', passingScore: 50, shuffleQuestions: false });
    setEditingQuiz(null);
    setShowCreateModal(false);
  };

  const handleEdit = (quiz) => {
    setEditingQuiz(quiz);
    setForm({
      title: quiz.title,
      description: quiz.description || '',
      timeLimit: quiz.timeLimit || '',
      passingScore: quiz.passingScore,
      shuffleQuestions: quiz.shuffleQuestions
    });
    setShowCreateModal(true);
  };

  const handlePublishToggle = async (quiz) => {
    setPublishingId(quiz.id);
    await genericUpdateMutation.mutateAsync({ isPublished: !quiz.isPublished });
    setPublishingId(null);
  };

  const updateMutation = useUpdateQuizMutation(classroomId, editingQuiz?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingQuiz) {
        await updateMutation.mutateAsync(form);
      } else {
        await createMutation.mutateAsync(form);
      }
      resetForm();
    } catch (err) {
      console.error('Error saving quiz:', err);
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this quiz? All student attempts will also be deleted.')) return;
    await deleteMutation.mutateAsync(quizId);
  };

  return (
    <div>
      {/* Header */}
      {isTeacher && (
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Quiz
          </button>
        </div>
      )}

      {/* Quiz Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : quizzes?.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">No Quizzes Yet</h3>
          <p className="text-gray-500 text-sm mt-1">
            {isTeacher ? 'Click "Create Quiz" to add your first assessment.' : 'Your teacher has not created any quizzes yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence>
            {quizzes?.map(quiz => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                classroomId={classroomId}
                isTeacher={isTeacher}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPublishToggle={handlePublishToggle}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-1">{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
              <p className="text-sm text-gray-500 mb-6">You can add questions after creating the quiz.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title *</label>
                  <input
                    required
                    type="text"
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="e.g. Chapter 3 Assessment"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    placeholder="Brief description for students..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                    rows="2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.timeLimit}
                      onChange={e => setForm({...form, timeLimit: e.target.value})}
                      placeholder="No limit"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.passingScore}
                      onChange={e => setForm({...form, passingScore: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setForm({...form, shuffleQuestions: !form.shuffleQuestions})}
                    className={`w-10 h-5 rounded-full transition-colors ${form.shuffleQuestions ? 'bg-indigo-500' : 'bg-gray-200'} flex items-center px-0.5`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.shuffleQuestions ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm text-gray-700">Shuffle question order</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetForm} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 text-sm">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingQuiz ? 'Save Changes' : 'Create Quiz'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuizList;
