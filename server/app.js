// Express app setup
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import propertiesRoutes from './routes/properties.routes.js';
import authRoutes from './routes/auth.routes.js';
import reservationsRoutes from './routes/reservations.routes.js';
import adminRoutes from './routes/admin.routes.js';
import botRoutes from './routes/bot.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.resolve(__dirname, '../client');

app.use(cors());
app.use(express.json());

app.use(express.static(clientPath));
app.use('/api/properties', propertiesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/assistant', botRoutes);
app.use('/api/user', userRoutes);

// Fallback to index for client-side routes
app.get('*', (req, res) => {
	res.sendFile(path.join(clientPath, 'index.html'));
});

export default app;