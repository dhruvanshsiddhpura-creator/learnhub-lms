// Keep track of active connections: userId -> Set of socketId
const userSockets = new Map();

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register user socket
    socket.on('register', (userId) => {
      if (!userId) return;
      socket.userId = userId;
      
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      console.log(`User ${userId} registered socket ${socket.id}`);
      
      // Join user's personal room for notifications
      socket.join(`user:${userId}`);
    });

    // Join a direct classroom chat room
    socket.on('join_chat', ({ classroomId, studentId }) => {
      const room = `chat:${classroomId}:${studentId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    // Handle typing indicator
    socket.on('typing', ({ classroomId, studentId, userName }) => {
      const room = `chat:${classroomId}:${studentId}`;
      // Broadcast to others in the room
      socket.to(room).emit('typing', { classroomId, studentId, userName });
    });

    socket.on('stop_typing', ({ classroomId, studentId }) => {
      const room = `chat:${classroomId}:${studentId}`;
      socket.to(room).emit('stop_typing', { classroomId, studentId });
    });

    // Mark messages as seen in real-time
    socket.on('messages_seen', ({ classroomId, studentId, viewerId }) => {
      const room = `chat:${classroomId}:${studentId}`;
      socket.to(room).emit('messages_seen', { classroomId, studentId, viewerId });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      if (socket.userId && userSockets.has(socket.userId)) {
        const sockets = userSockets.get(socket.userId);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(socket.userId);
        }
      }
    });
  });
};

// Helper to broadcast socket events to specific users
export const sendSocketEvent = (io, userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Helper to broadcast socket events to a chat room
export const sendChatRoomEvent = (io, classroomId, studentId, event, data) => {
  if (io) {
    io.to(`chat:${classroomId}:${studentId}`).emit(event, data);
  }
};
