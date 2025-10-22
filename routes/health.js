const express = require('express');
const router = express.Router();
const { testConnection } = require('../config/appwrite');
const { logger } = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const appwriteStatus = await testConnection();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        appwrite: appwriteStatus.success ? 'connected' : 'disconnected',
        worker: 'running'
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      }
    };
    
    if (!appwriteStatus.success) {
      health.status = 'degraded';
      health.services.appwrite_error = appwriteStatus.message;
    }
    
    res.json(health);
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;
