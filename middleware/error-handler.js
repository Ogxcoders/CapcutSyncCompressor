const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`Error: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method 
  });
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Route not found'
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
