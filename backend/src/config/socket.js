import { Server } from 'socket.io';

let ioInstance = null;

/**
 * Initialize Socket.io on the primary HTTP server instance.
 */
export const initSocket = (httpServer, allowedOrigins = []) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          process.env.CORS_ORIGIN === '*' ||
          allowedOrigins.includes(origin) ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:')
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by Socket.io CORS'));
        }
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected (${socket.id}): ${reason}`);
    });
  });

  return ioInstance;
};

/**
 * Return the active Socket.io Server instance, if initialized.
 */
export const getIO = () => ioInstance;

/**
 * Safely broadcast a real-time event to connected clients.
 */
export const emitEvent = (eventName, payload) => {
  if (ioInstance) {
    ioInstance.emit(eventName, payload);
  }
};

