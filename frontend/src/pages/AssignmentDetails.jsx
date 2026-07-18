import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  useAssignmentDetailsQuery,
  useSubmitAssignmentMutation,
  useGradeSubmissionMutation
} from '../api/classroomApi';
import {
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  Award,
  Upload,
  Download,
  Check,
  CheckCircle,
  FileText,
  User,
  MessageSquare,
  AlertCircle,
  X,
  FileDown
} from 'lucide-react';

const AssignmentDetails = () => {
  const { classroomId, assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Queries & Mutations
  const { data: assignment, isLoading, error } = useAssignmentDetailsQuery(assignmentId);
  const submitMutation = useSubmitAssignmentMutation(assignmentId);
  const gradeMutation = useGradeSubmissionMutation(assignmentId);

  // States
  const [submissionForm, setSubmissionForm] = useState({ submissionText: '', file: null });
  const [gradingModal, setGradingModal] = useState({ show: false, submission: null, marks: '', feedback: '' });
  const [dragActive, setDragActive] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const triggerAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000);
  };

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
      setSubmissionForm({ ...submissionForm, file: e.dataTransfer.files[0] });
    }
  };

  const handleHomeworkSubmit = async (e) => {
    e.preventDefault();
    if (!submissionForm.file) {
      return triggerAlert('Please attach a file before submitting.', 'error');
    }
    setSubmitLoading(true);
    try {
      await submitMutation.mutateAsync(submissionForm);
      triggerAlert('Homework submitted successfully!');
      setSubmissionForm({ submissionText: '', file: null });
      setIsResubmitting(false);
    } catch (err) {
      triggerAlert(err.response?.data?.message || 'Failed to submit assignment', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    const marksInt = parseInt(gradingModal.marks);
    if (isNaN(marksInt) || marksInt < 0 || marksInt > assignment.maxMarks) {
      return triggerAlert(`Score must be a number between 0 and ${assignment.maxMarks}`, 'error');
    }

    setSubmitLoading(true);
    try {
      await gradeMutation.mutateAsync({
        submissionId: gradingModal.submission.id,
        marks: marksInt,
        feedback: gradingModal.feedback
      });
      triggerAlert('Grade and feedback submitted successfully!');
      setGradingModal({ show: false, submission: null, marks: '', feedback: '' });
    } catch (err) {
      triggerAlert('Failed to submit grade', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleGradeClick = (sub) => {
    setGradingModal({
      show: true,
      submission: sub,
      marks: sub.marks !== null ? sub.marks.toString() : '',
      feedback: sub.feedback || ''
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary-500 animate-spin"></div>
        </div>
        <p className="mt-4 text-dark-400 font-semibold animate-pulse">Syncing assignment portal...</p>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Assignment not found</h2>
          <p className="text-sm text-dark-400">
            {error?.response?.data?.message || 'This assignment does not exist or you do not have permission.'}
          </p>
          <button
            onClick={() => navigate(`/classroom/${classroomId}`)}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={14} /> Back to Classroom
          </button>
        </div>
      </div>
    );
  }

  const isTeacher = user.role === 'TEACHER' && assignment.classroom.teacherId === user.id;
  const deadlineDate = new Date(assignment.deadline);
  const isPastDeadline = new Date() > deadlineDate;

  // Resolve Student status badges
  let statusText = 'Pending';
  let statusClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
  if (user.role === 'STUDENT') {
    const sub = assignment.submission;
    if (sub) {
      if (sub.marks !== null) {
        statusText = 'Graded';
        statusClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      } else if (sub.isLate) {
        statusText = 'Submitted Late';
        statusClass = 'bg-red-500/10 border-red-500/20 text-red-400';
      } else {
        statusText = 'Submitted';
        statusClass = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      }
    } else if (isPastDeadline) {
      statusText = 'Missing (Overdue)';
      statusClass = 'bg-red-950/20 border-red-500/25 text-red-400';
    }
  }

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

      {/* Background blur elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-primary-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none"></div>

      <div className="max-w-5xl w-full mx-auto space-y-6 relative z-10 animate-fade-in">
        
        {/* Navigation header */}
        <button
          onClick={() => navigate(`/classroom/${classroomId}`)}
          className="flex items-center gap-2 text-sm font-semibold text-dark-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Classroom
        </button>

        {/* Hero Header Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-dark-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-300 text-xs font-semibold">
                <FileText size={14} /> Assignment Specification
              </span>
              
              {user.role === 'STUDENT' && (
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusClass}`}>
                  {statusText}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {assignment.title}
            </h1>
          </div>

          <div className="flex gap-4 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-bold text-dark-500 uppercase tracking-widest block">Deadline</span>
              <span className={`text-sm font-bold flex items-center gap-1 mt-0.5 ${isPastDeadline ? 'text-red-400' : 'text-white'}`}>
                <Clock size={14} />
                {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="text-right border-l border-dark-800 pl-4">
              <span className="text-[10px] font-bold text-dark-500 uppercase tracking-widest block">Max Score</span>
              <span className="text-sm font-bold text-white flex items-center gap-1 mt-0.5 justify-end">
                <Award size={14} className="text-amber-500" />
                {assignment.maxMarks} Marks
              </span>
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Assignment Details & Attachment Reference */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-dark-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-dark-800 pb-2">
                Requirements Description
              </h3>
              <p className="text-xs sm:text-sm text-dark-200 leading-relaxed whitespace-pre-wrap font-normal">
                {assignment.description}
              </p>

              {/* Downloadable Reference Material Attachment */}
              {assignment.attachmentUrl && (
                <div className="pt-4 border-t border-dark-850">
                  <span className="text-[10px] font-bold text-dark-500 uppercase tracking-widest block mb-2">Reference Attachment</span>
                  <a
                    href={assignment.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-900 hover:bg-dark-850 border border-dark-800 rounded-xl text-xs font-semibold text-primary-400 transition-all hover:text-primary-300"
                  >
                    <FileDown size={14} />
                    Download Specifications Reference
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Student Submission Workspace or Teacher Submissions roster */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* STUDENT WORKSPACE */}
            {user.role === 'STUDENT' && (
              <>
                {/* SUBMISSION FORM (PENDING OR RESUBMIT) */}
                {(!assignment.submission || isResubmitting) ? (
                  <div className="glass-panel p-6 rounded-2xl border border-dark-800 space-y-6 animate-slide-up">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                        {isResubmitting ? 'Resubmit Homework' : 'Submit Homework'}
                      </h3>
                      <p className="text-[11px] text-dark-400">
                        {isPastDeadline 
                          ? "This assignment is overdue. You can submit your work, but it will be flagged as late." 
                          : "Upload your code zip, sheet document, or calculations."}
                      </p>
                    </div>

                    <form onSubmit={handleHomeworkSubmit} className="space-y-4">
                      {/* Drag & Drop File */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-dark-300">Homework File Attachment</label>
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          className={`border border-dashed rounded-xl p-6 text-center transition-all ${
                            dragActive 
                              ? 'border-primary-500 bg-primary-500/5' 
                              : submissionForm.file 
                                ? 'border-emerald-500/30 bg-emerald-500/5' 
                                : 'border-dark-800 hover:border-dark-750 bg-dark-950/20'
                          }`}
                        >
                          <input
                            type="file"
                            required
                            id="submission-file-upload"
                            onChange={(e) => setSubmissionForm({ ...submissionForm, file: e.target.files[0] })}
                            className="hidden"
                          />
                          <label htmlFor="submission-file-upload" className="cursor-pointer space-y-2 block">
                            <Upload size={22} className={`mx-auto ${submissionForm.file ? 'text-emerald-400' : 'text-dark-500'}`} />
                            <div className="text-xs text-dark-300">
                              {submissionForm.file ? (
                                <span className="font-semibold text-emerald-400 truncate max-w-[220px] inline-block">
                                  {submissionForm.file.name}
                                </span>
                              ) : (
                                <span>Drag & drop or <span className="font-semibold text-primary-400 hover:text-primary-300">browse</span></span>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-dark-300">Notes / Comments (Optional)</label>
                        <textarea
                          rows={3}
                          value={submissionForm.submissionText}
                          onChange={(e) => setSubmissionForm({ ...submissionForm, submissionText: e.target.value })}
                          placeholder="Write quick notes for the professor..."
                          className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs resize-none animate-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        {isResubmitting && (
                          <button
                            type="button"
                            onClick={() => setIsResubmitting(false)}
                            className="flex-1 py-3 bg-dark-900 border border-dark-800 text-dark-300 font-semibold text-xs rounded-xl hover:bg-dark-850"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={submitLoading}
                          className="flex-1 py-3 bg-gradient-brand text-white font-semibold text-xs rounded-xl hover:shadow-primary-500/10 active:scale-[0.98] transition-all border border-primary-500/25 disabled:opacity-50"
                        >
                          {submitLoading ? 'Uploading...' : 'Submit Assignment'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  // SUBMISSION ACTIVE VIEW
                  <div className="space-y-6 animate-slide-up">
                    
                    {/* Grading Report */}
                    {assignment.submission.marks !== null && (
                      <div className="glass-panel p-6 rounded-2xl border border-emerald-500/35 bg-emerald-500/5 space-y-4">
                        <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-widest">
                          <CheckCircle size={18} /> Grading Report
                        </h4>
                        
                        <div className="flex justify-between items-center bg-dark-950/40 p-4 rounded-xl border border-dark-800">
                          <div>
                            <span className="text-[10px] font-bold text-dark-450 uppercase tracking-widest block mb-0.5">Assigned Score</span>
                            <span className="text-2xl font-black text-white">{assignment.submission.marks} <span className="text-sm text-dark-450 font-normal">/ {assignment.maxMarks}</span></span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-dark-450 uppercase tracking-widest block mb-1">Status</span>
                            <span className="px-2.5 py-0.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-extrabold uppercase">
                              Graded
                            </span>
                          </div>
                        </div>

                        {assignment.submission.feedback && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-dark-400 uppercase tracking-widest block">Professor Comments</span>
                            <p className="text-xs text-dark-200 bg-dark-950/40 p-3 rounded-lg border border-dark-850 leading-relaxed italic">
                              "{assignment.submission.feedback}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submission Specs details */}
                    <div className="glass-panel p-6 rounded-2xl border border-dark-800 space-y-4">
                      <div className="flex justify-between items-center border-b border-dark-800 pb-2.5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                          Your Submission
                        </h3>
                        {assignment.submission.isLate && (
                          <span className="px-2 py-0.5 rounded bg-red-950/20 border border-red-500/10 text-red-400 text-[8px] font-extrabold uppercase">
                            Late Submission
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3.5 bg-dark-950/50 rounded-xl border border-dark-800">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="p-2 bg-primary-600/10 text-primary-400 rounded-lg shrink-0">
                              <FileText size={16} />
                            </div>
                            <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                              {assignment.submission.fileUrl.split('/').pop().substring(13)}
                            </span>
                          </div>
                          <a
                            href={assignment.submission.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-dark-900 border border-dark-750 text-dark-300 hover:text-white transition-all"
                            title="Download Attachment"
                          >
                            <Download size={12} />
                          </a>
                        </div>

                        {assignment.submission.submissionText && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-dark-500 uppercase tracking-widest block">Your Comments</span>
                            <p className="text-xs text-dark-300 bg-dark-950/30 border border-dark-850/60 p-3 rounded-lg leading-relaxed whitespace-pre-wrap font-normal">
                              {assignment.submission.submissionText}
                            </p>
                          </div>
                        )}

                        <div className="text-[10px] text-dark-500 pt-2 border-t border-dark-855/40 text-center italic">
                          Submitted on {new Date(assignment.submission.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Resubmit button if not graded and before deadline */}
                      {assignment.submission.marks === null && !isPastDeadline && (
                        <button
                          onClick={() => {
                            setSubmissionForm({
                              submissionText: assignment.submission.submissionText || '',
                              file: null
                            });
                            setIsResubmitting(true);
                          }}
                          className="w-full py-2.5 bg-dark-900 hover:bg-dark-850 border border-dark-800 text-dark-200 font-bold text-xs rounded-xl transition-colors"
                        >
                          Resubmit Assignment
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* TEACHER GRADING SUBMISSIONS ROSTER DASHBOARD */}
        {isTeacher && (
          <section className="space-y-4 pt-4 border-t border-dark-850">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-dark-800 pb-3">
              <Users size={18} className="text-primary-400" />
              Grading Workspace Dashboard
              <span className="px-2 py-0.5 rounded bg-dark-800 text-[10px] text-dark-300 font-bold">
                {assignment.submissions.length} Submissions
              </span>
            </h3>

            {assignment.submissions.length === 0 ? (
              <div className="glass-panel p-16 rounded-xl text-center space-y-4 max-w-md mx-auto border border-dashed border-dark-750">
                <div className="w-12 h-12 rounded-full bg-dark-900 flex items-center justify-center mx-auto text-dark-500">
                  <Users size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No homework submitted yet</h4>
                  <p className="text-xs text-dark-400 leading-relaxed font-normal">
                    Student rosters will appear here immediately as they upload attachments.
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-panel overflow-hidden border border-dark-800 rounded-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-dark-900/60 border-b border-dark-800 text-[10px] font-bold text-dark-400 uppercase tracking-widest">
                        <th className="p-4">Student</th>
                        <th className="p-4">Submitted Date</th>
                        <th className="p-4">Flags</th>
                        <th className="p-4">Grade Score</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-800/60 text-xs">
                      {assignment.submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-dark-900/20 transition-all font-normal">
                          <td className="p-4 flex items-center gap-3">
                            <img src={sub.student.avatar} alt={sub.student.name} className="w-8 h-8 rounded-full border border-dark-750" />
                            <div>
                              <h5 className="font-bold text-white">{sub.student.name}</h5>
                              <span className="text-[10px] text-dark-500">{sub.student.email}</span>
                            </div>
                          </td>
                          <td className="p-4 text-dark-300">
                            {new Date(sub.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4">
                            {sub.isLate ? (
                              <span className="px-2 py-0.5 rounded bg-red-950/20 border border-red-500/10 text-red-400 text-[8px] font-extrabold uppercase">
                                Late
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-950/20 border border-emerald-500/10 text-emerald-400 text-[8px] font-extrabold uppercase">
                                On Time
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {sub.marks !== null ? (
                              <span className="font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2 py-1 rounded text-[11px]">
                                {sub.marks} / {assignment.maxMarks}
                              </span>
                            ) : (
                              <span className="text-dark-500 italic">Not Graded</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleGradeClick(sub)}
                              className="px-3 py-1.5 bg-primary-950/40 hover:bg-primary-950/80 border border-primary-500/25 text-primary-400 hover:text-primary-300 text-[10px] font-bold rounded-lg transition-colors"
                            >
                              {sub.marks !== null ? 'Re-Grade' : 'Grade Submission'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* TEACHER GRADING INTERFACE INLINE MODAL */}
      {gradingModal.show && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl p-6 relative border border-dark-800 animate-slide-up">
            <button
              onClick={() => setGradingModal({ show: false, submission: null, marks: '', feedback: '' })}
              className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <img src={gradingModal.submission.student.avatar} alt="" className="w-10 h-10 rounded-full border border-primary-500/20" />
              <div>
                <h3 className="text-base font-bold text-white">Grade homework: {gradingModal.submission.student.name}</h3>
                <p className="text-xs text-dark-400">Assign scores and offer textual guidelines.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-dark-950/40 border border-dark-850 space-y-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-dark-450 uppercase tracking-widest">Student Homework File</span>
                <a
                  href={gradingModal.submission.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-400 hover:text-primary-300"
                >
                  <Download size={12} /> Download Attachment
                </a>
              </div>

              {gradingModal.submission.submissionText && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-dark-450 uppercase tracking-widest block">Submission Comments</span>
                  <p className="text-xs text-dark-300 bg-dark-950/60 p-2.5 rounded border border-dark-800 leading-normal font-normal italic">
                    "{gradingModal.submission.submissionText}"
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300 flex justify-between">
                  <span>Score Marks</span>
                  <span className="text-dark-500 font-bold">Max Limit: {assignment.maxMarks} Marks</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={assignment.maxMarks}
                  value={gradingModal.marks}
                  onChange={(e) => setGradingModal({ ...gradingModal, marks: e.target.value })}
                  placeholder={`e.g. 95`}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Feedback Comments</label>
                <textarea
                  rows={4}
                  value={gradingModal.feedback}
                  onChange={(e) => setGradingModal({ ...gradingModal, feedback: e.target.value })}
                  placeholder="Offer constructive critiques and suggestions..."
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-xs resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setGradingModal({ show: false, submission: null, marks: '', feedback: '' })}
                  className="flex-1 py-3 bg-dark-900 border border-dark-800 text-dark-300 font-semibold text-xs rounded-xl hover:bg-dark-850"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 py-3 bg-gradient-brand text-white font-semibold text-xs rounded-xl hover:shadow-primary-500/10 active:scale-[0.98] transition-all border border-primary-500/25 disabled:opacity-50"
                >
                  {submitLoading ? 'Saving...' : 'Submit Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetails;
