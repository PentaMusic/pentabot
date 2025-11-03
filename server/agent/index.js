import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (server/.env)
dotenv.config({ path: path.join(__dirname, '../.env') });

// Debug: Check if environment variables are loaded
console.log('EXECUTOR_URL:', process.env.EXECUTOR_URL || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

// Check executor service health on startup
async function checkExecutorHealth() {
    const executorUrl = process.env.EXECUTOR_URL || 'http://localhost:3000';
    try {
        const response = await fetch(`${executorUrl}/health`);
        if (response.ok) {
            const health = await response.json();
            console.log('✅ Executor service is healthy:', health);
        } else {
            console.log('⚠️ Executor service health check failed:', response.status);
        }
    } catch (error) {
        console.log('❌ Executor service is not accessible:', error.message);
        console.log('   Make sure the executor service is running on port 3000');
    }
}

// Check executor health after a short delay
setTimeout(checkExecutorHealth, 2000);

import express from 'express';
import cors from 'cors';

// 라우터 imports
import authRoutes from './routes/auth.js';
import threadRoutes from './routes/threads.js';
import messageRoutes from './routes/messages.js';
import usageRoutes from './routes/usage.js';
import generateRoutes from './routes/generate.js';
import profileRoutes from './routes/profile.js';
import knowledgeRoutes from './routes/knowledge.js';
import adminRoutes from './routes/admin.js';

const app = express();
const port = 3001;

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - Client: ${req.ip || req.connection.remoteAddress}`);
  next();
});

// Set charset for proper Korean character handling
app.use((req, res, next) => {
  res.charset = 'utf-8';
  // Set proper headers for Korean filename support
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Disposition');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
    };
    
    console.log(`[HEALTH CHECK] Server health requested - Status: ${healthStatus.status}`);
    res.json(healthStatus);
});

// 기본 엔드포인트
app.get('/', (req, res) => {
    res.json({
        message: 'Pentabot API Server',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            auth: '/auth/*',
            threads: '/threads/*',
            messages: '/messages/*',
            usage: '/usage/*',
            generate: '/generate/*',
            profile: '/profile/*',
            knowledge: '/knowledge/*',
            admin: '/admin/*',
        },
    });
});

// 라우터 등록
app.use('/auth', authRoutes);
app.use('/threads', threadRoutes);
app.use('/messages', messageRoutes);
app.use('/usage', usageRoutes);
app.use('/generate', generateRoutes);
app.use('/profile', profileRoutes);
app.use('/knowledge', knowledgeRoutes);
app.use('/admin', adminRoutes);

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Export the app for Genezio
export default app;

const server = app.listen(port || 0, () => {
    const actualPort = server.address().port;
    console.log(`🚀 Pentabot API Server running on port ${actualPort}`);
    console.log(`📖 API Documentation available at http://localhost:${actualPort}`);
});
