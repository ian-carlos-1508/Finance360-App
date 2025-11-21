/* File: server/index.ts */

import express from 'express';
import cors from 'cors';
// FIX: Added .ts extension
import journeyRoutes from './routes/journey.routes.ts';
import onboardingRoutes from './routes/onboarding.routes.ts';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); 
app.use(express.json());

// --- MOUNT ROUTES ---
app.use('/api/journey', journeyRoutes);
app.use('/api/onboarding', onboardingRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('Finance 360 Backend is Running 🚀');
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Backend Server running on http://localhost:${PORT}`);
});