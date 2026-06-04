import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: () => void
) {
  // Get token from Authorization header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: "Authentication required",
      message: "No token provided",
    });
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("❌ JWT_SECRET not set in environment");
    return res.status(500).json({
      error: "Server configuration error",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Attach user ID to request object
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    return res.status(403).json({
      error: "Invalid token",
      message: "Token verification failed",
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: () => void
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
  } catch (error) {
    // Don't fail, just continue without user
    console.log("Optional auth failed, continuing without user");
  }

  next();
}

