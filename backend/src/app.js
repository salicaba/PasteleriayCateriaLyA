// src/app.js
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js'; 
import menuRoutes from './modules/menu/menu.routes.js';
import posRoutes from './modules/pos/pos.routes.js';
import kitchenRoutes from './modules/kitchen/kitchen.routes.js';
import pasteleriaRoutes from './modules/pasteleria/pasteleria.routes.js'; 
import settingsRoutes from './modules/settings/settings.routes.js';
import cashRoutes from './modules/cash/cash.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js'; // <-- NUEVO INVENTARIO

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rutas Base
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/menu', menuRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/pasteleria', pasteleriaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/inventory', inventoryRoutes); // <-- NUEVA RUTA DE INVENTARIO

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema 𝓛𝔂𝓐 operando correctamente' });
});

export default app;