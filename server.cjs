require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// CLIENT_URL can hold several origins, separated by commas
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""));

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ---------- Model ----------
const todoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    completed: { type: Boolean, default: false },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  },
  { timestamps: true }
);

const Todo = mongoose.model("Todo", todoSchema);

// ---------- Helpers ----------
const pick = (body) => {
  const data = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.completed !== undefined) data.completed = body.completed;
  if (body.priority !== undefined) data.priority = body.priority;
  return data;
};

const handleError = (res, err) => {
  if (err.name === "ValidationError" || err.name === "CastError") {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Something went wrong on the server" });
};

// ---------- Routes ----------
app.get("/", (req, res) => res.json({ status: "ok", service: "taskflow-api" }));

app.get("/api/todos", async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    handleError(res, err);
  }
});

app.post("/api/todos", async (req, res) => {
  try {
    const todo = await Todo.create(pick(req.body));
    res.status(201).json(todo);
  } catch (err) {
    handleError(res, err);
  }
});

app.put("/api/todos/:id", async (req, res) => {
  try {
    const todo = await Todo.findByIdAndUpdate(req.params.id, pick(req.body), {
      new: true,
      runValidators: true,
    });
    if (!todo) return res.status(404).json({ error: "Todo not found" });
    res.json(todo);
  } catch (err) {
    handleError(res, err);
  }
});

app.delete("/api/todos/:id", async (req, res) => {
  try {
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) return res.status(404).json({ error: "Todo not found" });
    res.json({ message: "Todo deleted", id: todo._id });
  } catch (err) {
    handleError(res, err);
  }
});

// ---------- Start ----------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });