import express from 'express';
import { signUp, signIn, signOut, getCurrentUser, updateUserProfile, verifyToken } from "../database/auth.js";

const router = express.Router();

// 회원가입
router.post("/signup", async (req, res) => {
  const { email, password, displayName } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const result = await signUp(email, password, displayName);
  
  if (result.success) {
    res.status(201).json({ 
      message: "User created successfully",
      user: result.user,
      session: result.session
    });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// 로그인
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const result = await signIn(email, password);
  
  if (result.success) {
    res.json({ 
      message: "Signed in successfully",
      user: result.user,
      session: result.session
    });
  } else {
    res.status(401).json({ error: result.error });
  }
});

// 로그아웃
router.post("/signout", async (req, res) => {
  const result = await signOut();
  
  if (result.success) {
    res.json({ message: "Signed out successfully" });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// 현재 사용자 정보 조회
router.get("/user", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authHeader.substring(7);
  const result = await getCurrentUser(token);
  
  if (result.success) {
    res.json({ user: result.user });
  } else {
    res.status(401).json({ error: result.error });
  }
});

// 사용자 프로필 업데이트(update)
router.put("/profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authHeader.substring(7);
  const userResult = await verifyToken(token);
  
  if (!userResult.success) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const updates = req.body;
  const result = await updateUserProfile(userResult.user.id, updates);
  
  if (result.success) {
    res.json({ message: "Profile updated successfully", user: result.user });
  } else {
    res.status(400).json({ error: result.error });
  }
});

export default router;