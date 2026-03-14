import "dotenv/config";
import cors from "cors";
import express from "express";
import redditAuthRoutes from "./config/reddit-oauth-simple";
import postsRoutes from "./routes/posts";
import tradingRoutes from "./routes/trading";
import portfolioRoutes from "./routes/portfolio";
import transactionsRoutes from "./routes/transactions";
import leaderboardRoutes from "./routes/leaderboard";
import priceHistoryRoutes from "./routes/price-history";
import waitlistRoutes from "./routes/waitlist";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - Allow all origins for development
app.use(
	cors({
		origin: true, // Allow all origins
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	}),
);

// Routes
app.use(redditAuthRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/trading", tradingRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/price-history", priceHistoryRoutes);
app.use("/api/waitlist", waitlistRoutes);

app.get("/", (_req, res) => {
	res.status(200).json({ message: "RedCircle API is running" });
});

// Health check
app.get("/health", (_req, res) => {
	res.status(200).json({ status: "healthy" });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error("\n❌ === Global Error Handler ===");
	console.error("Error:", err);
	console.error("Path:", req.path);
	console.error("Method:", req.method);
	console.error("❌ === End of Error ===\n");
	
	res.status(500).json({
		error: "Internal server error",
		message: err.message,
	});
});

	const port = process.env.PORT || 3000;
	app.listen(Number(port), () => {
	console.log(`\nServer running on port ${port}\n`);
});
