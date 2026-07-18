import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  useQuizDetailsQuery,
  useAddQuestionMutation,
  useDeleteQuestionMutation,
  useUpdateQuizMutation,
  useStartQuizMutation,
  useSubmitQuizMutation,
  useQuizResultsQuery,
  useUpdateQuestionMutation
} from '../api/classroomApi';
import {
  ArrowLeft, Plus, Trash2, CheckCircle, XCircle, Clock, Trophy, Target,
  Loader2, ChevronDown, ChevronUp, Edit2, Save, BookOpen, AlertCircle, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// QUESTION BUILDER (Teacher View)
// ==========================================
const QuestionBuilder = ({ quizId, classroomId, question, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    text: question.text,
    type: question.type,
    marks: question.marks,
    explanation: question.explanation || '',
    options: question.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect }))
  });

  const updateMutation = useUpdateQuestionMutation(classroomId, quizId, question.id);
  const deleteMutation = useDeleteQuestionMutation(classroomId, quizId);

  const addOption = () => setForm({ ...form, options: [...form.options, { text: '', isCorrect: false }] });
  const removeOption = (idx) => setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  const toggleCorrect = (idx) => {
    const opts = [...form.options];
    if (form.type === 'MCQ' || form.type === 'TRUE_FALSE') {
      opts.forEach((o, i) => o.isCorrect = i === idx);
    } else {
      opts[idx].isCorrect = !opts[idx].isCorrect;
    }
    setForm({ ...form, options: opts });
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync(form);
    setIsEditing(false);
  };

  const typeColors = {
    MCQ: 'bg-blue-100 text-blue-700',
    MSQ: 'bg-purple-100 text-purple-700',
    TRUE_FALSE: 'bg-amber-100 text-amber-700',
    SHORT_ANSWER: 'bg-teal-100 text-teal-700'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${typeColors[question.type]}`}>
          {question.type.replace('_', ' ')}
        </span>
        <p className="text-sm font-medium text-gray-800 flex-1 truncate">{question.text}</p>
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{question.marks} pt{question.marks !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => { setIsExpanded(!isExpanded); setIsEditing(false); }} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => { setIsExpanded(true); setIsEditing(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => {
            if (window.confirm('Delete this question?')) deleteMutation.mutate(question.id);
          }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100">
            {isEditing ? (
              <div className="p-5 space-y-4">
                <textarea
                  value={form.text}
                  onChange={e => setForm({...form, text: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                  rows="2"
                  placeholder="Question text..."
                />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                      <option value="MCQ">MCQ</option>
                      <option value="MSQ">Multi-Select</option>
                      <option value="TRUE_FALSE">True/False</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Marks</label>
                    <input type="number" min="1" value={form.marks} onChange={e => setForm({...form, marks: parseInt(e.target.value)})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                </div>

                {form.type !== 'SHORT_ANSWER' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600">Answer Options</label>
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCorrect(i)}
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                            opt.isCorrect ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'
                          }`}
                        />
                        <input
                          value={opt.text}
                          onChange={e => {
                            const opts = [...form.options];
                            opts[i].text = e.target.value;
                            setForm({...form, options: opts});
                          }}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        {form.options.length > 2 && (
                          <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {form.type !== 'TRUE_FALSE' && (
                      <button onClick={addOption} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Add Option
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Explanation (shown after submission)</label>
                  <input value={form.explanation} onChange={e => setForm({...form, explanation: e.target.value})}
                    placeholder="Optional explanation..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSave} disabled={updateMutation.isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5">
                    {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                {question.options.map(opt => (
                  <div key={opt.id} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${opt.isCorrect ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 bg-gray-50'}`}>
                    {opt.isCorrect ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />}
                    {opt.text}
                  </div>
                ))}
                {question.type === 'SHORT_ANSWER' && (
                  <p className="text-xs text-gray-400 italic">Short answer — graded manually</p>
                )}
                {question.explanation && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                    <strong>Explanation:</strong> {question.explanation}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// ADD QUESTION FORM
// ==========================================
const AddQuestionForm = ({ classroomId, quizId, onClose }) => {
  const [form, setForm] = useState({
    text: '', type: 'MCQ', marks: 1, explanation: '',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]
  });
  const addMutation = useAddQuestionMutation(classroomId, quizId);

  const toggleCorrect = (idx) => {
    const opts = [...form.options];
    if (form.type === 'MCQ' || form.type === 'TRUE_FALSE') opts.forEach((o, i) => { o.isCorrect = i === idx; });
    else opts[idx].isCorrect = !opts[idx].isCorrect;
    setForm({ ...form, options: opts });
  };

  const handleTypeChange = (type) => {
    let opts = form.options;
    if (type === 'TRUE_FALSE') opts = [{ text: 'True', isCorrect: false }, { text: 'False', isCorrect: false }];
    else if (type === 'SHORT_ANSWER') opts = [];
    else if (opts.length < 2) opts = [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
    setForm({ ...form, type, options: opts });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    await addMutation.mutateAsync(form);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
      <h4 className="font-semibold text-gray-800">New Question</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea required value={form.text} onChange={e => setForm({...form, text: e.target.value})}
          placeholder="Enter your question..." rows="2"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select value={form.type} onChange={e => handleTypeChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
              <option value="MCQ">MCQ (Single)</option>
              <option value="MSQ">Multi-Select</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="SHORT_ANSWER">Short Answer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Marks</label>
            <input type="number" min="1" value={form.marks} onChange={e => setForm({...form, marks: parseInt(e.target.value)})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white" />
          </div>
        </div>

        {form.type !== 'SHORT_ANSWER' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Answer Options <span className="text-gray-400">(click circle to mark correct)</span></label>
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button type="button" onClick={() => toggleCorrect(i)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${opt.isCorrect ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-gray-300 hover:border-emerald-400'}`} />
                <input value={opt.text} onChange={e => {
                  const opts = [...form.options]; opts[i].text = e.target.value; setForm({...form, options: opts});
                }} placeholder={`Option ${i + 1}`}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                {form.type !== 'TRUE_FALSE' && form.options.length > 2 && (
                  <button type="button" onClick={() => setForm({...form, options: form.options.filter((_, idx) => idx !== i)})} className="text-gray-400 hover:text-red-500">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {form.type !== 'TRUE_FALSE' && (
              <button type="button" onClick={() => setForm({...form, options: [...form.options, { text: '', isCorrect: false }]})}
                className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:text-indigo-700">
                <Plus className="w-3.5 h-3.5" /> Add Option
              </button>
            )}
          </div>
        )}

        <input value={form.explanation} onChange={e => setForm({...form, explanation: e.target.value})}
          placeholder="Explanation (optional, shown after submission)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white" />

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={addMutation.isPending}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5">
            {addMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Question
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// ==========================================
// STUDENT QUIZ TAKER
// ==========================================
const QuizTaker = ({ quiz, classroomId, existingAttempt }) => {
  const navigate = useNavigate();
  const [started, setStarted] = useState(!!existingAttempt);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit ? quiz.timeLimit * 60 : null);
  const [submitted, setSubmitted] = useState(!!existingAttempt?.submittedAt);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const startMutation = useStartQuizMutation(classroomId, quiz.id);
  const submitMutation = useSubmitQuizMutation(classroomId, quiz.id);
  const { data: resultData } = useQuizResultsQuery(classroomId, submitted ? quiz.id : null);

  const questions = quiz.questions || [];

  useEffect(() => {
    if (started && !submitted && timeLeft !== null) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [started, submitted]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!existingAttempt) {
      try {
        await startMutation.mutateAsync();
      } catch (err) {
        if (err.response?.status !== 400) { console.error(err); return; }
      }
    }
    startTimeRef.current = Date.now();
    setStarted(true);
  };

  const selectOption = (questionId, optionId, isMulti) => {
    setAnswers(prev => {
      const prevSelected = prev[questionId]?.selectedOptionIds || [];
      let newSelected;
      if (isMulti) {
        newSelected = prevSelected.includes(optionId)
          ? prevSelected.filter(id => id !== optionId)
          : [...prevSelected, optionId];
      } else {
        newSelected = [optionId];
      }
      return { ...prev, [questionId]: { selectedOptionIds: newSelected } };
    });
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const formattedAnswers = questions.map(q => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id]?.selectedOptionIds || [],
      textAnswer: answers[q.id]?.textAnswer || null
    }));

    try {
      const res = await submitMutation.mutateAsync({ answers: formattedAnswers, timeTaken });
      setResult(res);
      setSubmitted(true);
    } catch (err) {
      console.error('Submit error', err);
    }
  };

  // Show result screen after submission
  if (submitted && (result || existingAttempt?.submittedAt)) {
    const score = result?.score ?? existingAttempt?.score;
    const passed = result?.isPassed ?? existingAttempt?.isPassed;
    const totalMarks = result?.totalMarks ?? existingAttempt?.totalMarks;
    const maxMarks = result?.maxMarks ?? existingAttempt?.maxMarks;

    return (
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 text-white text-4xl font-black shadow-lg ${passed ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-red-400 to-red-600'}`}>
            {passed ? '🎉' : '📚'}
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{passed ? 'Quiz Passed!' : 'Keep Studying'}</h2>
          <p className="text-gray-500 mb-6">{passed ? 'Great work! You cleared the passing threshold.' : `You need ${quiz.passingScore}% to pass this quiz.`}</p>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Your Score</span>
              <span className="font-bold text-gray-900">{Math.round(score)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${score}%` }} />
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Marks: {totalMarks} / {maxMarks}</span>
              <span>Passing: {quiz.passingScore}%</span>
            </div>
          </div>

          <button onClick={() => navigate(-1)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
            Back to Quizzes
          </button>
        </motion.div>
      </div>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <BookOpen className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h2>
          {quiz.description && <p className="text-gray-500 text-sm mb-6">{quiz.description}</p>}

          <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <BookOpen className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
              <div className="font-bold text-gray-800">{questions.length}</div>
              <div className="text-gray-500 text-xs">Questions</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <div className="font-bold text-gray-800">{quiz.timeLimit ? `${quiz.timeLimit} min` : '∞'}</div>
              <div className="text-gray-500 text-xs">Time Limit</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <Target className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <div className="font-bold text-gray-800">{quiz.passingScore}%</div>
              <div className="text-gray-500 text-xs">To Pass</div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 mb-6 text-xs text-left">
            <AlertCircle className="w-4 h-4 inline mr-1.5" />
            You can only attempt this quiz once. Make sure you are ready before starting.
          </div>

          <button
            onClick={handleStart}
            disabled={startMutation.isPending}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {startMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Begin Quiz
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQ];
  const isMulti = question?.type === 'MSQ';
  const selected = answers[question?.id]?.selectedOptionIds || [];
  const progress = ((currentQ + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Timer & Progress */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm font-semibold text-gray-600">
          Question {currentQ + 1} of {questions.length}
        </span>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full ${timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm mb-6"
        >
          <div className="flex items-start gap-3 mb-5">
            <span className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              {currentQ + 1}
            </span>
            <p className="text-base font-semibold text-gray-900 leading-snug pt-1">{question?.text}</p>
          </div>

          {question?.type === 'SHORT_ANSWER' ? (
            <textarea
              value={answers[question.id]?.textAnswer || ''}
              onChange={e => setAnswers(prev => ({...prev, [question.id]: { ...prev[question.id], textAnswer: e.target.value }}))}
              placeholder="Type your answer here..."
              rows="4"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          ) : (
            <div className="space-y-2.5">
              {isMulti && <p className="text-xs text-indigo-600 font-medium mb-2">Select all that apply</p>}
              {question?.options?.map(opt => {
                const isSelected = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectOption(question.id, opt.id, isMulti)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-${isMulti ? 'sm' : 'full'} border-2 flex-shrink-0 transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`} />
                      {opt.text}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setCurrentQ(q => Math.max(q - 1, 0))}
          disabled={currentQ === 0}
          className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          ← Previous
        </button>
        {currentQ < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQ(q => Math.min(q + 1, questions.length - 1))}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Next Question →
          </button>
        ) : (
          <button
            onClick={() => {
              if (window.confirm('Submit quiz? You cannot change your answers after submitting.')) handleSubmit();
            }}
            disabled={submitMutation.isPending}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Submit Quiz
          </button>
        )}
      </div>

      {/* Question dots navigator */}
      <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            className={`w-7 h-7 text-xs font-bold rounded-lg transition-all ${
              i === currentQ ? 'bg-indigo-600 text-white' :
              answers[q.id]?.selectedOptionIds?.length > 0 || answers[q.id]?.textAnswer ? 'bg-emerald-100 text-emerald-700' :
              'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// TEACHER RESULTS VIEW
// ==========================================
const TeacherResultsView = ({ classroomId, quizId }) => {
  const { data: attempts, isLoading } = useQuizResultsQuery(classroomId, quizId);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;

  const submitted = (attempts || []).filter(a => a.submittedAt);
  const avgScore = submitted.length > 0 ? Math.round(submitted.reduce((s, a) => s + (a.score || 0), 0) / submitted.length) : 0;
  const passCount = submitted.filter(a => a.isPassed).length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Attempts', value: submitted.length, icon: Users, color: 'indigo' },
          { label: 'Avg Score', value: `${avgScore}%`, icon: Target, color: 'purple' },
          { label: 'Pass Rate', value: submitted.length > 0 ? `${Math.round((passCount/submitted.length)*100)}%` : 'N/A', icon: Trophy, color: 'emerald' }
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
            <stat.icon className={`w-6 h-6 text-${stat.color}-500 mx-auto mb-2`} />
            <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Student Attempt List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-700 text-sm">Student Results</h3>
        </div>
        {submitted.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No submissions yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {submitted.map(att => (
              <div key={att.id} className="flex items-center gap-4 px-5 py-3.5">
                <img src={att.student.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${att.student.name}`}
                  alt={att.student.name} className="w-8 h-8 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{att.student.name}</p>
                  <p className="text-xs text-gray-500">{new Date(att.submittedAt).toLocaleDateString()}</p>
                </div>
                <div className={`text-sm font-bold px-3 py-1 rounded-full ${att.isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {Math.round(att.score)}%
                </div>
                {att.isPassed ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MAIN QUIZ PAGE
// ==========================================
const QuizPage = () => {
  const { id: classroomId, quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');

  const { data, isLoading } = useQuizDetailsQuery(classroomId, quizId);
  const updateMutation = useUpdateQuizMutation(classroomId, quizId);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  const quiz = data?.quiz;
  const attempt = data?.attempt;

  if (!quiz) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
      Quiz not found.
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Classroom
        </button>

        {/* Quiz Header */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${quiz.isPublished ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {quiz.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900">{quiz.title}</h1>
              {quiz.description && <p className="text-gray-500 text-sm mt-1">{quiz.description}</p>}
            </div>
            {isTeacher && (
              <button
                onClick={() => updateMutation.mutateAsync({ isPublished: !quiz.isPublished })}
                disabled={updateMutation.isPending}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${quiz.isPublished ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {quiz.isPublished ? 'Unpublish' : 'Publish Quiz'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-5 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-indigo-400" />{quiz.questions?.length || 0} Questions</span>
            {quiz.timeLimit && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-400" />{quiz.timeLimit} min</span>}
            <span className="flex items-center gap-1.5"><Target className="w-4 h-4 text-purple-400" />Pass: {quiz.passingScore}%</span>
          </div>
        </div>

        {/* Teacher: Tab switcher for questions and results */}
        {isTeacher ? (
          <>
            <div className="flex border-b border-gray-200 mb-6">
              {['questions', 'results'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`capitalize pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'questions' && (
              <div className="space-y-4">
                {quiz.questions?.map(q => (
                  <QuestionBuilder key={q.id} question={q} quizId={quizId} classroomId={classroomId} />
                ))}

                {showAddQuestion ? (
                  <AddQuestionForm classroomId={classroomId} quizId={quizId} onClose={() => setShowAddQuestion(false)} />
                ) : (
                  <button
                    onClick={() => setShowAddQuestion(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    <Plus className="w-5 h-5" /> Add Question
                  </button>
                )}
              </div>
            )}

            {activeTab === 'results' && <TeacherResultsView classroomId={classroomId} quizId={quizId} />}
          </>
        ) : (
          // Student: show quiz taker
          <QuizTaker quiz={quiz} classroomId={classroomId} existingAttempt={attempt} />
        )}
      </div>
    </div>
  );
};

export default QuizPage;
