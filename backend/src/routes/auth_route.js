import express from "express"
import { 
    checkAuth, 
    login, 
    logout, 
    signup, 
    updateProfile, 
    deleteAccount,
    changePassword,
    requestPasswordReset,
    resetPassword
} from "../controllers/auth_controller.js";
import { protectRoute } from "../middleware/auth_middleware.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// Protected routes
router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);

router.delete("/delete-account", protectRoute, deleteAccount);

router.put("/change-password", protectRoute, changePassword);  

// Forgot password routes
router.post("/reset-password", requestPasswordReset);   
               
router.post("/reset-password/confirm", resetPassword);  

export default router;