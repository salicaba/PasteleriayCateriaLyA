import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL, 
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://localhost',
    'https://localhost',
    'capacitor://localhost',
    'https://pasteleriay-cateria-ly-a-q2rr.vercel.app'
  ];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Permitir si no hay origen (ej. Postman o APK nativo), si está en la lista exacta, o si es CUALQUIER subdominio de Vercel
        if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error('No permitido por CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 60000,
    // 🔥 Recuperación suave de sesión tras cambios rápidos de app o microcortes
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
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