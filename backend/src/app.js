import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import posRoutes from './modules/pos/pos.routes.js';
import kitchenRoutes from './modules/kitchen/kitchen.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Rutas Base
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/kitchen', kitchenRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema LyA operando' });
});

export default app;