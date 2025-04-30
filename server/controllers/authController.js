import User from "../models/User.js"
import { generateToken } from "../middleware/auth.js"

// Register a new user
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Check if user already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ error: "User already exists" })
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
    })

    // Generate JWT token
    const token = generateToken(user._id)

    // Return user data and token
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    })
  } catch (error) {
    console.error("Register error:", error)
    res.status(500).json({ error: error.message || "Server error" })
  }
}

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    // Generate JWT token
    const token = generateToken(user._id)

    // Return user data and token
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: error.message || "Server error" })
  }
}

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password")
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    res.status(200).json(user)
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ error: error.message || "Server error" })
  }
}
