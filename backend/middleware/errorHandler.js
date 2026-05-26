const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`Error occurred: ${err.message}\nStack: ${err.stack}`);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    status: statusCode,
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
