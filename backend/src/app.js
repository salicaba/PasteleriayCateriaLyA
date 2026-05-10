import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import posRoutes from './modules/pos/pos.routes.js';
import kitchenRoutes from './modules/kitchen/kitchen.routes.js';
// 1. IMPORTA LAS NUEVAS RUTAS
import pasteleriaRoutes from './modules/pasteleria/pasteleria.routes.js'; 

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rutas Base
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/kitchen', kitchenRoutes);
// 2. REGISTRA LA NUEVA RUTA BASE PARA PASTELERÍA
app.use('/api/pasteleria', pasteleriaRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema LyA operando' });
});

export default app;