const mongoose = require('mongoose');
const config = require('config');

// Get MongoDB URI from environment variable or config file
const mongoURI = process.env.MONGODB_URI || config.get('mongoURI');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;