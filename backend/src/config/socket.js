import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL, 
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'https://pasteleriay-cateria-ly-a-q2rr.vercel.app'
  ];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
    pingTimeout: 60000, 
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado vía WebSocket: ${socket.id}`);
    
    // 🔥 AISLAMIENTO DE SESIONES: El usuario se inscribe a su sala privada
    socket.on('join_user_room', (userId) => {
      if (userId) {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        console.log(`👤 Socket ${socket.id} blindado en sala: ${roomName}`);
      }
    });

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