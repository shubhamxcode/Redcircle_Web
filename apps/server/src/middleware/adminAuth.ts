import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers["x-admin-secret"] as string | undefined;
  const expected = process.env.ADMIN_SECRET;

  if (!expected) {
    console.error("❌ ADMIN_SECRET env var not set");
    return res.status(500).json({ error: "Admin not configured" });
  }
  if (!secret || secret !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
