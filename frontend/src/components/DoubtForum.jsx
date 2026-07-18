import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  useDoubtsQuery,
  useCreateDoubtMutation,
  useResolveDoubtMutation,
  useDoubtDetailsQuery,
  useReplyDoubtMutation,
  useToggleUpvoteMutation
} from '../api/classroomApi';
import { Search, HelpCircle, CheckCircle, MessageSquare, ThumbsUp, Send, Loader2, User, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DoubtReplyItem = ({ reply, classroomId, doubtId }) => {
  const toggleUpvoteMutation = useToggleUpvoteMutation(classroomId, doubtId);

  return (
    <div className={`p-4 border-b border-gray-100 last:border-b-0 flex gap-3 ${reply.isTeacherReply ? 'bg-amber-50/50' : 'bg-white'}`}>
      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
        {reply.author.avatar ? (
          <img src={reply.author.avatar} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <User className="w-full h-full p-1.5 text-gray-400" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{reply.author.name}</span>
          {reply.isTeacherReply && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              <Crown className="w-3 h-3" /> Instructor
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {new Date(reply.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{reply.content}</p>
        
        <div className="mt-3 flex items-center gap-4">
          <button 
            onClick={() => toggleUpvoteMutation.mutate(reply.id)}
            disabled={toggleUpvoteMutation.isPending}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              reply.hasUpvoted ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${reply.hasUpvoted ? 'fill-current' : ''}`} />
            {reply._count?.upvotes || 0} Helpful
          </button>
        </div>
      </div>
    </div>
  );
};

const DoubtThread = ({ doubt, classroomId }) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');

  const { data: details, isLoading } = useDoubtDetailsQuery(classroomId, isExpanded ? doubt.id : null);
  const resolveMutation = useResolveDoubtMutation(classroomId, doubt.id);
  const replyMutation = useReplyDoubtMutation(classroomId, doubt.id);

  const isAuthor = user.id === doubt.studentId;
  const isTeacher = user.role === 'TEACHER' || user.role === 'ADMIN'; // Wait, need classroom context, but role is good enough for UI gating

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    await replyMutation.mutateAsync({ content: replyText });
    setReplyText('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
      {/* Doubt Header Card */}
      <div 
        className="p-5 cursor-pointer flex gap-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-shrink-0 mt-1">
          {doubt.isResolved ? (
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          ) : (
            <HelpCircle className="w-6 h-6 text-orange-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-lg text-gray-900">{doubt.title}</h3>
            {(isAuthor || isTeacher) && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  resolveMutation.mutate();
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  doubt.isResolved 
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {doubt.isResolved ? 'Mark Unresolved' : 'Mark Resolved'}
              </button>
            )}
          </div>
          <p className="text-gray-600 mt-2 text-sm line-clamp-2">{doubt.content}</p>
          
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 font-medium">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" /> {doubt.student.name}
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" /> {doubt._count?.replies || 0} replies
            </div>
            <span>•</span>
            <span>{new Date(doubt.createdAt).toLocaleDateString()}</span>
            
            <div className="ml-auto text-blue-600 flex items-center gap-1">
              {isExpanded ? 'Hide Thread' : 'View Thread'}
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Thread Area */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 bg-gray-50"
          >
            <div className="p-5 bg-white border-b border-gray-100">
              <p className="text-gray-800 whitespace-pre-wrap text-sm">{doubt.content}</p>
            </div>
            
            {/* Replies List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : details?.replies?.length > 0 ? (
                details.replies.map(reply => (
                  <DoubtReplyItem key={reply.id} reply={reply} classroomId={classroomId} doubtId={doubt.id} />
                ))
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No replies yet. Be the first to help!
                </div>
              )}
            </div>

            {/* Reply Input */}
            <form onSubmit={handleReply} className="p-4 bg-white border-t border-gray-200 flex gap-3 items-end">
              <div className="flex-1">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a helpful reply..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  rows="2"
                />
              </div>
              <button 
                type="submit"
                disabled={!replyText.trim() || replyMutation.isPending}
                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                {replyMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DoubtForum = ({ classroomId }) => {
  const [search, setSearch] = useState('');
  const [filterResolved, setFilterResolved] = useState('all');
  const [showAskForm, setShowAskForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const { data: doubts, isLoading } = useDoubtsQuery(
    classroomId, 
    search, 
    filterResolved === 'all' ? undefined : filterResolved === 'resolved'
  );
  
  const createMutation = useCreateDoubtMutation(classroomId);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    await createMutation.mutateAsync({ title: newTitle, content: newContent });
    setNewTitle('');
    setNewContent('');
    setShowAskForm(false);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search doubts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={filterResolved}
            onChange={(e) => setFilterResolved(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 outline-none shadow-sm"
          >
            <option value="all">All Doubts</option>
            <option value="unresolved">Open / Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
          
          <button 
            onClick={() => setShowAskForm(!showAskForm)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-colors whitespace-nowrap"
          >
            {showAskForm ? 'Cancel' : 'Ask Question'}
          </button>
        </div>
      </div>

      {/* Ask Doubt Form */}
      <AnimatePresence>
        {showAskForm && (
          <motion.form 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">What's your doubt?</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title summary</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. How does Array.reduce work?"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Detailed explanation</label>
                <textarea 
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Provide context or code snippets..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none resize-y min-h-[120px]"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button 
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-70 flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Post Doubt
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Doubts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : doubts?.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No doubts found</h3>
            <p className="text-gray-500 mt-1">Looks like everyone understands everything!</p>
          </div>
        ) : (
          doubts?.map(doubt => (
            <DoubtThread key={doubt.id} doubt={doubt} classroomId={classroomId} />
          ))
        )}
      </div>
    </div>
  );
};

export default DoubtForum;
