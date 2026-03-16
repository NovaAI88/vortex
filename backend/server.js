const express = require("express");

const app = express();
const port = 3000;

// CORS setup
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3001", "http://localhost:3002"];
  if (origin && allowed.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get("/", (_req, res) => {
  res.send("AETHER backend is running.");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "AETHER backend" });
});

app.get("/status", (_req, res) => {
  res.json({
    service: "AETHER backend",
    status: "running",
    time: new Date().toISOString()
  });
});

// --- Mock Order Book Endpoint ---
app.get("/api/orderbook", (_req, res) => {
  res.json({
    bids: [["67085.00", "0.80"], ["67080.50", "0.60"]],
    asks: [["67086.50", "0.75"], ["67090.00", "1.10"]],
    support: "67,100.00",
    resistance: "67,300.00"
  });
});

// --- Mock Trade Flow Endpoint ---
app.get("/api/trades", (_req, res) => {
  res.json([
    { side: "buy", price: "67085", size: "0.098", time: "13:47:59" },
    { side: "sell", price: "67086", size: "0.25", time: "13:47:52" },
    { side: "buy", price: "67087", size: "0.11", time: "13:47:45" }
  ]);
});

// --- Mock Strategies Performance Endpoint ---
app.get("/api/strategies/performance", (_req, res) => {
  res.json([
    { strategy: "Momentum", pnl: 1240, trades: 42 },
    { strategy: "MeanReversion", pnl: -210, trades: 18 }
  ]);
});

// --- Mock Strategies Weights Endpoint ---
app.get("/api/strategies/weights", (_req, res) => {
  res.json({ Momentum: 0.6, MeanReversion: 0.4 });
});

// --- Mock Engine Status Endpoint ---
app.get("/api/engine/status", (_req, res) => {
  res.json({
    status: "running",
    mode: "paper",
    timestamp: new Date().toISOString()
  });
});

// --- Mock Engine Risk Endpoint ---
app.get("/api/engine/risk", (_req, res) => {
  res.json({
    riskLevel: "low",
    exposure: 0.32
  });
});

app.listen(port, () => {
  console.log(`AETHER backend running on port ${port}`);
});

