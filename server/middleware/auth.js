const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../models/User');

// Authentication middleware
const auth = async (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || config.get('jwtSecret'));
    
    // Add user from payload
    req.user = decoded.user;
    
    // Check if user exists in database
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    // Add full user object to request
    req.userObj = user;
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin check middleware
auth.checkAdmin = (req, res, next) => {
  if (req.userObj && req.userObj.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin privileges required' });
  }
};

module.exports = auth;