import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  // En producción, tomaremos la URL de Vercel. En local, permitimos todo temporalmente.
  const allowedOrigin = process.env.FRONTEND_URL || '*';

  io = new Server(server, {
    cors: {
      origin: allowedOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado vía WebSocket: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado');
  }
  return io;
};