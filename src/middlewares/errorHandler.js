const logger = require('../utils/logger');

/**
 * Error Handling Middleware
 * 
 * This middleware function is used to handle errors that occur during the request-response cycle in the Express application.
 * 
 * How it works:
 * - It receives any error passed to `next(err)` or thrown in async route handlers/controllers.
 * - It logs the error details using the custom Winston logger (`logger.error`), capturing either the error stack or message.
 * - It sends a generic HTTP 500 (Internal Server Error) response to the client, without exposing sensitive error details.
 * 
 * Usage:
 * - Import and use this middleware at the end of your middleware stack in your main server file (e.g., `app.js` or `server.js`):
 *     const errorHandler = require('./src/middlewares/errorHandler');
 *     app.use(errorHandler);
 * - This ensures all unhandled errors are logged and responded to in a consistent way.
 * 
 * Benefits:
 * - Centralizes error logging and response formatting.
 * - Keeps your code DRY by avoiding repetitive error handling in every controller.
 * - Improves maintainability and debugging.
 */

function errorHandler(err, req, res, next) {
  logger.error(err.stack || err.message, err);
  res.status(500).json({ message: 'Internal server error' });
}

module.exports = errorHandler;