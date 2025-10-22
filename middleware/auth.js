const { logger } = require('../utils/logger');

function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const expectedApiKey = process.env.API_KEY;
  
  if (!expectedApiKey || expectedApiKey === 'change-this-secret-key') {
    logger.warn('API_KEY not configured properly');
    return res.status(500).json({ 
      error: 'API authentication not configured' 
    });
  }
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required. Provide in X-API-Key header or api_key query parameter' 
    });
  }
  
  if (apiKey !== expectedApiKey) {
    logger.warn(`Invalid API key attempt from ${req.ip}`);
    return res.status(403).json({ 
      error: 'Invalid API key' 
    });
  }
  
  next();
}

module.exports = {
  authenticateApiKey
};
