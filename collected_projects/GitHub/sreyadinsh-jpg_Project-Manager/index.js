const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const Task = require('./models/Task'); // This imports the blueprint we made

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.log(err));

// --- API ROUTES ---

// 1. Get all tasks (To show on our Kanban board)
app.get('/api/tasks', async (req, res) => {
    const tasks = await Task.find();
    res.json(tasks);
});

// 2. Create a new task
app.post('/api/tasks', async (req, res) => {
    const newTask = new Task(req.body);
    await newTask.save();
    res.json(newTask);
});

// 3. Update a task (For moving from 'ToDo' to 'Done')
app.put('/api/tasks/:id', async (req, res) => {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedTask);
});
// Add a comment to a task
app.post('/api/tasks/:id/comments', async (req, res) => {
  const task = await Task.findById(req.params.id);
  task.comments.push({ text: req.body.text });
  await task.save();
  res.json(task);
});
// Route for adding comments to a specific task
app.post('/api/tasks/:id/comments', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    task.comments.push({ text: req.body.text });
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Could not add comment" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));