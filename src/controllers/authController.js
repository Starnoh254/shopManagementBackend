const authService = require('../services/authService');

class authController {
  // Register a new user
  static async register(req, res) {
    const { email, password, name } = req.body;
    try {
      const result = await authService.registerUser(email, password, name);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message
      });
    }
  }

  // Login a user
  static async login(req, res) {
    const { email, password } = req.body;
    try {
      const result = await authService.loginUser(email, password);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message
        });
      }

      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message
      });
    }
  }
}

module.exports = authController;