import express from 'express';
import { signup, login, updateProfile, checkAuth } from '../controllers/userController.js';
import { protectRoute } from '../middleware/auth.js';

const userRoutes = express.Router();

userRoutes.post("/signup", signup);
userRoutes.post("/login", login);
userRoutes.put("/update-profile", protectRoute, updateProfile);
userRoutes.get("/check", protectRoute, checkAuth);

export default userRoutes;
