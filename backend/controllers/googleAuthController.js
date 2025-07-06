const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @desc    Google OAuth Authentication
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google token is required" });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists, update profile image if not set
      if (!user.profileImageUrl && picture) {
        user.profileImageUrl = picture;
        await user.save();
      }

      // Return user data with JWT
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        token: generateToken(user._id),
      });
    } else {
      // Create new user
      user = await User.create({
        name,
        email,
        profileImageUrl: picture,
        googleId, // Store Google ID for future reference
        password: "google-auth-" + Math.random().toString(36).substr(2, 9), // Dummy password for Google users
        role: "member", // Default role for Google users
      });

      // Return user data with JWT
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ 
      message: "Google authentication failed", 
      error: error.message 
    });
  }
};

module.exports = { googleAuth }; 