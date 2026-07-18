import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../api/socketService';
import { 
  useChatRosterQuery, 
  useChatConversationQuery, 
  useSendMessageMutation 
} from '../api/classroomApi';
import { Send, Paperclip, User, Loader2, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatHelp = ({ classroomId }) => {
  const { user } = useAuth();
  const socket = getSocket();
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typists, setTypists] = useState(new Set());
  const typingTimeoutRef = useRef(null);
  const chatEndRef = useRef(null);

  // Queries
  const { data: rosterData, isLoading: isLoadingRoster, refetch: refetchRoster } = useChatRosterQuery(classroomId);
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  // For students, their chat target is always the teacher. For teachers, it's the selected student.
  const activeChatTarget = isTeacher ? selectedStudentId : user?.id;

  const { data: conversation, isLoading: isLoadingConversation, refetch: refetchConversation } = useChatConversationQuery(
    classroomId,
    activeChatTarget
  );

  const sendMessageMutation = useSendMessageMutation(classroomId, activeChatTarget);

  // Set initial selected student if teacher
  useEffect(() => {
    if (isTeacher && rosterData?.roster && rosterData.roster.length > 0 && !selectedStudentId) {
      setSelectedStudentId(rosterData.roster[0].student.id);
    }
  }, [isTeacher, rosterData, selectedStudentId]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !activeChatTarget) return;

    const currentRoomTarget = activeChatTarget;
    socket.emit('join_chat', { classroomId, studentId: currentRoomTarget });

    const handleNewMessage = (msg) => {
      // If the message belongs to this active chat, refetch conversation
      refetchConversation();
      // Also refetch roster to update unread counts and last message
      refetchRoster();
    };

    const handleTyping = ({ studentId, userName }) => {
      if (studentId === currentRoomTarget) {
        setTypists(prev => new Set(prev).add(userName));
      }
    };

    const handleStopTyping = ({ studentId, userName }) => {
      if (studentId === currentRoomTarget) {
        setTypists(prev => {
          const newSet = new Set(prev);
          newSet.delete(userName);
          return newSet;
        });
      }
    };

    const handleMessagesSeen = () => {
      refetchConversation();
      refetchRoster();
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('messages_seen', handleMessagesSeen);

    // Whenever conversation finishes loading, notify seen
    if (conversation && conversation.some(m => m.receiverId === user.id && !m.isSeen)) {
      socket.emit('messages_seen', { classroomId, studentId: currentRoomTarget, viewerId: user.id });
    }

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('messages_seen', handleMessagesSeen);
    };
  }, [socket, activeChatTarget, classroomId, refetchConversation, refetchRoster, conversation, user.id]);

  const handleTypingStart = (e) => {
    setMessageText(e.target.value);
    
    if (!isTyping && socket && activeChatTarget) {
      setIsTyping(true);
      socket.emit('typing', { classroomId, studentId: activeChatTarget, userName: user.name });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socket && activeChatTarget) {
        socket.emit('stop_typing', { classroomId, studentId: activeChatTarget, userName: user.name });
      }
    }, 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !selectedFile) return;

    if (socket && activeChatTarget) {
      socket.emit('stop_typing', { classroomId, studentId: activeChatTarget, userName: user.name });
      setIsTyping(false);
    }

    await sendMessageMutation.mutateAsync({
      content: messageText,
      file: selectedFile
    });

    setMessageText('');
    setSelectedFile(null);
  };

  return (
    <div className="flex h-[70vh] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      
      {/* Sidebar - Roster */}
      <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h3 className="font-semibold text-gray-800">
            {isTeacher ? 'Student Chats' : 'Your Teacher'}
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoadingRoster ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : isTeacher ? (
            rosterData?.roster?.map((item) => (
              <div 
                key={item.student.id} 
                onClick={() => setSelectedStudentId(item.student.id)}
                className={`p-4 cursor-pointer border-b border-gray-100 transition-colors ${selectedStudentId === item.student.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-100 border-l-4 border-l-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {item.student.avatar ? (
                      <img src={item.student.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-full h-full p-2 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-medium text-gray-900 truncate">{item.student.name}</h4>
                      {item.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {item.lastMessage ? item.lastMessage.content || 'File attached' : 'No messages yet'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Student View Roster
            <div className="p-4 cursor-pointer bg-blue-50 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                  {rosterData?.teacher?.avatar ? (
                    <img src={rosterData.teacher.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-full h-full p-2 text-gray-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{rosterData?.teacher?.name || 'Teacher'}</h4>
                  <p className="text-sm text-gray-500">Instructor</p>
                </div>
                {rosterData?.unreadCount > 0 && (
                  <div className="ml-auto bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {rosterData.unreadCount}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-dark-950">
        {!activeChatTarget ? (
          <div className="flex-1 flex items-center justify-center text-dark-400">
            Select a student to start chatting
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
              {isLoadingConversation ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : conversation?.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  No messages yet. Say hi!
                </div>
              ) : (
                conversation?.map((msg) => {
                  const isMine = msg.senderId === user.id;
                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col max-w-[70%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div 
                        className={`px-4 py-2 rounded-2xl ${
                          isMine 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        {msg.fileUrl && (
                          <div className="mb-2">
                            {msg.fileType === 'IMAGE' ? (
                              <img src={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}/${msg.fileUrl.replace(/\\/g, '/')}`} alt="attachment" className="rounded-lg max-w-full h-auto max-h-48 object-cover" />
                            ) : (
                              <a href={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}/${msg.fileUrl.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline text-sm bg-black/10 p-2 rounded">
                                <Paperclip className="w-4 h-4" /> Download Attachment
                              </a>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMine && (
                          msg.isSeen ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
              {typists.size > 0 && (
                <div className="self-start text-xs text-gray-400 italic animate-pulse">
                  {Array.from(typists).join(', ')} {typists.size > 1 ? 'are' : 'is'} typing...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-gray-50 flex items-end gap-2">
              <div className="flex-1 bg-white rounded-2xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all overflow-hidden flex flex-col">
                {selectedFile && (
                  <div className="bg-blue-50 text-blue-600 px-3 py-1.5 text-xs flex justify-between items-center border-b border-blue-100">
                    <span className="truncate">{selectedFile.name}</span>
                    <button type="button" onClick={() => setSelectedFile(null)} className="hover:text-blue-800 font-bold">&times;</button>
                  </div>
                )}
                <div className="flex items-center pr-2">
                  <textarea
                    value={messageText}
                    onChange={handleTypingStart}
                    placeholder="Type a message..."
                    className="flex-1 max-h-32 p-3 outline-none resize-none bg-transparent text-gray-900"
                    rows="1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                  <label className="p-2 text-gray-400 hover:text-blue-600 cursor-pointer transition-colors">
                    <Paperclip className="w-5 h-5" />
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={sendMessageMutation.isPending || (!messageText.trim() && !selectedFile)}
                className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendMessageMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatHelp;
