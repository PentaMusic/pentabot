import { verifyToken } from "../database/auth.js";

// 인증 미들웨어 (next())
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // console.log('Auth middleware check:', {
  //   authHeader: authHeader ? 'Present' : 'Missing',
  //   url: req.url,
  //   method: req.method
  // });
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid auth header');
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authHeader.substring(7);
  // console.log('Token extracted, length:', token.length);
  
  const userResult = await verifyToken(token);
  
  if (!userResult.success) {
    console.log('Token verification failed:', userResult.error);
    return res.status(401).json({ error: "Invalid API key" });
  }

  console.log('Auth successful for user:', userResult.user?.id);
  req.user = userResult.user;
  next();
};