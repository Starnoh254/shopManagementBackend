const jwt = require('jsonwebtoken');

class authMiddleware {
    static authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
              return res.status(403).json({ message: 'Invalid token' });
            }
            req.user = user; // Attach user info to request
            next();
        });
      }
}

module.exports = authMiddleware