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
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Video Compression Service - Server B</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 10px; }
        .status { color: #10b981; font-weight: bold; font-size: 18px; margin-bottom: 30px; }
        .links { display: grid; gap: 15px; }
        .link-card { background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
        .link-card h3 { margin: 0 0 10px 0; color: #333; }
        .link-card p { margin: 0 0 10px 0; color: #666; font-size: 14px; }
        .link-card a { color: #667eea; text-decoration: none; font-weight: 500; }
        .link-card a:hover { text-decoration: underline; }
        .info { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎬 Video Compression Service</h1>
        <div class="status">✅ Server B is Running</div>
        
        <div class="links">
          <div class="link-card">
            <h3>📊 Admin Dashboard</h3>
            <p>Monitor compression queue and job status in real-time</p>
            <a href="/admin">Open Dashboard →</a>
          </div>
          
          <div class="link-card">
            <h3>💚 Health Check</h3>
            <p>View system status and Appwrite connection</p>
            <a href="/health">Check Health →</a>
          </div>
          
          <div class="link-card">
            <h3>📚 API Documentation</h3>
            <p>Complete API reference for developers</p>
            <a href="https://github.com" target="_blank">View Docs →</a>
          </div>
        </div>
        
        <div class="info">
          <strong>How it works:</strong><br>
          1. WordPress uploads video data to Appwrite<br>
          2. Server B downloads and compresses videos into HLS format<br>
          3. Compressed files are stored and URLs sent back to Appwrite<br>
          4. WordPress displays the adaptive streaming video player
        </div>
      </div>
    </body>
    </html>
  `);
});

app.use('/health', healthRouter);
app.use('/api', apiLimiter, apiRouter);
app.use('/storage/hls', storageRouter);

if (process.env.ADMIN_ENABLED === 'true') {
  const adminPath = process.env.ADMIN_PATH || '/admin';
  app.use(adminPath, express.static(path.join(__dirname, 'public')));
  app.get(adminPath, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });
  logger.info(`Admin dashboard enabled at ${adminPath}`);
}

app.use(notFoundHandler);
app.use(errorHandler);

function validateEnvironment() {
  const required = [
    'APPWRITE_ENDPOINT',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'DATABASE_ID',
    'COLLECTION_ID'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please configure these in your .env file or Replit Secrets');
    return false;
  }
  
  if (!process.env.API_KEY || process.env.API_KEY === 'change-this-secret-key') {
    logger.warn('API_KEY is not configured or using default value');
    logger.warn('API endpoints will not be properly secured');
  }
  
  return true;
}

async function startServer() {
  try {
    logger.info('Starting Video Compression Service...');
    
    if (!validateEnvironment()) {
      logger.error('Environment validation failed. Server cannot start.');
      process.exit(1);
    }
    
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
