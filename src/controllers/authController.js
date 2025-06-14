const authService = require('../services/authService');

class authController {
  // Register a new user
  static async register (req, res) {
    const { email, password } = req.body;
    try {
      const user = await authService.registerUser(email, password);
      res.status(201).json({ message: 'User registered', user });
    } catch (err) {
      if (err.message === 'User already exists') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  // Login a user
  static async login(req, res) {
    const { email, password } = req.body;
    try {
      const result = await authService.loginUser(email, password);
      res.status(200).json({status : "success", result});
    } catch (err) {
      if (err.message === 'Invalid credentials') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
}

module.exports = authController;