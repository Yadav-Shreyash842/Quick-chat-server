import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import jwt from "jsonwebtoken";

// Signup a new user

export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;
  try {
    if (!fullName || !email || !password || !bio) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
    });
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      success: true,
      message: "Signup successful",
      userData: newUser,
      token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}


// controller for login a user 

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      success: true,
      message: "Login successful",
      userData: user,
      token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Controller to check if user is authenticated

export const checkAuth = (req, res) =>{
    res.json({success:true, user:req.user});

}

//  Controller to update user profile

export const updateProfile = async (req, res) => {

 try {

    const { profilePic , bio, fullName} = req.body;
    const userId = req.user._id;

    let updatedUser;
    if(!profilePic){
        updatedUser = await User.findByIdAndUpdate(userId, {bio, fullName}, {new:true});
    }else{
        const upload = await cloudinary.uploader.upload(profilePic);
        updatedUser = await User.findByIdAndUpdate(userId, {profilePic: upload.secure_url, bio, fullName}, {new:true});
            
        }
        res.json({success: true,user:updatedUser} )
    } catch (error) {
        console.log(error.message);
          res.json({success: false, message: error.message} )
    
 }     

}