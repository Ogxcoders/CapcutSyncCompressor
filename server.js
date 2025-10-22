require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { logger } = require('./utils/logger');
const { initializeAppwrite } = require('./config/appwrite');
const { startWorker, stopWorker } = require('./services/worker');
const { cleanupTempFiles } = require('./utils/cleanup');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { apiLimiter } = require('./middleware/rate-limit');

const healthRouter = require('./routes/health');
const apiRouter = require('./routes/api');
const storageRouter = require('./routes/storage');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: 'Video Compression Service (Server B)',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      admin: '/admin',
      api: '/api',
      storage: '/storage/hls'
    }
  });
});

app.use('/health', healthRouter);
app.use('/api', apiLimiter, apiRouter);
app.use('/storage/hls', storageRouter);

if (process.env.ADMIN_ENABLED === 'true') {
  app.use(process.env.ADMIN_PATH || '/admin', express.static(path.join(__dirname, 'public')));
  logger.info('Admin dashboard enabled at /admin');
}

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    logger.info('Starting Video Compression Service...');
    
    const appwriteResult = initializeAppwrite();
    logger.info('Appwrite client initialized');
    
    const { testConnection } = require('./config/appwrite');
    const connectionTest = await testConnection();
    
    if (connectionTest.success) {
      logger.info('Appwrite connection verified successfully');
    } else {
      logger.warn(`Appwrite connection test failed: ${connectionTest.message}`);
      logger.warn('Worker will continue but may fail when processing jobs');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Public URL: ${process.env.PUBLIC_URL || `http://localhost:${PORT}`}`);
      
      startWorker();
      logger.info('Background worker started');
      
      const cleanupInterval = setInterval(() => {
        const tempPath = process.env.TEMP_PATH || './storage/temp';
        cleanupTempFiles(tempPath);
      }, 3600000);
      
      logger.info('Temp file cleanup scheduled (every hour)');
    });
    
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  stopWorker();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  stopWorker();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

startServer();
