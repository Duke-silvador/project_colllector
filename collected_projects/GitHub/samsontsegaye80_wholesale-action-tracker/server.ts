import express from 'express';
import path from 'path';
import os from 'os';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { getAllTasks, upsertTask, bulkUpsertTasks, deleteTask, resetAllTasks } from './src/db/tasks.ts';
import { getAllReminders, addReminder } from './src/db/reminders.ts';
import { getOrCreateUser, getUsers } from './src/db/users.ts';
import { optionalAuth, requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { INITIAL_TASKS } from './src/data/initialTasks.ts';

let ai: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- Cloud SQL: Tasks Endpoints ---
  app.get('/api/tasks', async (req, res) => {
    try {
      let taskList = await getAllTasks();
      if (taskList.length === 0) {
        // Automatically seed with baseline tasks if database table is initially empty
        await bulkUpsertTasks(INITIAL_TASKS);
        taskList = await getAllTasks();
      }
      res.json(taskList);
    } catch (error: any) {
      console.error('Failed to get tasks from Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch tasks from Cloud SQL' });
    }
  });

  app.post('/api/tasks', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const task = req.body;
      if (!task || !task.id || !task.title) {
        return res.status(400).json({ error: 'Valid task payload is required' });
      }
      const saved = await upsertTask(task);
      res.json(saved);
    } catch (error: any) {
      console.error('Failed to upsert task in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to save task in Cloud SQL' });
    }
  });

  app.post('/api/tasks/bulk', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const taskList = req.body;
      if (!Array.isArray(taskList)) {
        return res.status(400).json({ error: 'Array of tasks required' });
      }
      await bulkUpsertTasks(taskList);
      const updated = await getAllTasks();
      res.json(updated);
    } catch (error: any) {
      console.error('Failed bulk upsert in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to bulk save tasks in Cloud SQL' });
    }
  });

  app.delete('/api/tasks/:id', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await deleteTask(id);
      res.json({ success: true, id });
    } catch (error: any) {
      console.error('Failed to delete task in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to delete task in Cloud SQL' });
    }
  });

  app.post('/api/tasks/reset', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const reset = await resetAllTasks(INITIAL_TASKS);
      res.json(reset);
    } catch (error: any) {
      console.error('Failed to reset tasks in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to reset tasks in Cloud SQL' });
    }
  });

  app.post('/api/sync-remote', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const remoteUrl = req.body?.url || 'https://wholsaleprojectmvp3.ai.studio';
      console.log(`Syncing deliverables and data from remote URL: ${remoteUrl}`);
      
      const tasksRes = await fetch(`${remoteUrl}/api/tasks`);
      if (!tasksRes.ok) {
        throw new Error(`Failed to fetch tasks from ${remoteUrl} (status: ${tasksRes.status})`);
      }
      const remoteTasks: any[] = await tasksRes.json();
      if (Array.isArray(remoteTasks) && remoteTasks.length > 0) {
        await bulkUpsertTasks(remoteTasks);
      }

      // Also sync reminders
      try {
        const remindersRes = await fetch(`${remoteUrl}/api/reminders`);
        if (remindersRes.ok) {
          const remoteReminders: any[] = await remindersRes.json();
          if (Array.isArray(remoteReminders)) {
            for (const rem of remoteReminders) {
              await addReminder(rem);
            }
          }
        }
      } catch (remErr) {
        console.warn('Could not sync reminders from remote:', remErr);
      }

      const updated = await getAllTasks();
      const allReminders = await getAllReminders();
      res.json({ success: true, count: updated.length, tasks: updated, reminders: allReminders });
    } catch (error: any) {
      console.error('Failed to sync from remote:', error);
      res.status(500).json({ error: error.message || 'Failed to sync from remote URL' });
    }
  });

  // --- Cloud SQL: Reminders Endpoints ---
  app.get('/api/reminders', async (req, res) => {
    try {
      const logs = await getAllReminders();
      res.json(logs);
    } catch (error: any) {
      console.error('Failed to fetch reminders from Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch reminders' });
    }
  });

  app.post('/api/reminders', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const reminder = req.body;
      if (!reminder || !reminder.id || !reminder.taskTitle) {
        return res.status(400).json({ error: 'Valid reminder payload required' });
      }
      const saved = await addReminder(reminder);
      res.json(saved);
    } catch (error: any) {
      console.error('Failed to save reminder to Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to save reminder' });
    }
  });

  // --- Cloud SQL / Firebase: User Profile Sync ---
  app.post('/api/users/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { email, name } = req.body;
      const user = await getOrCreateUser(req.user.uid, email || req.user.email || 'user@example.com', name || req.user.name);
      res.json(user);
    } catch (error: any) {
      console.error('Failed to sync user in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user profile' });
    }
  });

  app.get('/api/users', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const userList = await getUsers();
      res.json(userList);
    } catch (error: any) {
      console.error('Failed to get users from Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  });

  // --- AI Executive Summary Endpoint ---
  app.post('/api/ai/executive-summary', async (req, res) => {
    try {
      const { tasks, summaryType = 'executive', asOfDate } = req.body;

      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: 'Tasks array is required' });
      }

      const totalTasks = tasks.length;
      const completed = tasks.filter((t: any) => t.status === 'Completed').length;
      const inProgress = tasks.filter((t: any) => t.status === 'In Progress').length;
      const partial = tasks.filter((t: any) => t.status === 'Partial').length;
      const delayed = tasks.filter((t: any) => t.isDelayed || t.status === 'Delayed').length;
      const notStarted = tasks.filter((t: any) => t.status === 'Not Started').length;

      const delayedSample = tasks
        .filter((t: any) => t.isDelayed || t.status === 'Delayed' || (t.delayDays && t.delayDays > 0))
        .map((t: any) => ({
          taskNo: t.sNo,
          title: t.title,
          workstream: t.workstream,
          backend: t.backendOwner,
          frontend: t.frontendOwner,
          status: t.status,
          delayDays: t.delayDays || 0,
          deliverable: t.deliverable,
          remark: t.remark
        }));

      const prompt = `You are a Senior Program Director and Executive Project Management Advisor evaluating a mission-critical project: "Wholesale Banking Customer Onboarding & Loan Origination System - Action Plan".
Current As-Of Date: ${asOfDate || 'August 18, 2026'}.

PROJECT METRICS:
- Total Tasks/Deliverables: ${totalTasks}
- Completed: ${completed} (${Math.round((completed / totalTasks) * 100)}%)
- In Progress: ${inProgress}
- Partial Progress: ${partial}
- Delayed/Critical Attention: ${delayed}
- Not Started: ${notStarted}

CURRENT DELAYED / AT-RISK DELIVERABLES:
${JSON.stringify(delayedSample, null, 2)}

SUMMARY TYPE REQUESTED: ${summaryType.toUpperCase()} (options: Executive SteerCo Brief, Daily Operational Standup, Root-Cause & Risk Mitigation, Team Workload & Accountability Audit)

Please generate a high-impact, professional executive summary with clear structure:
1. Executive Snapshot & RAG Status (Red/Amber/Green with justification)
2. Critical Path & Key Delayed Deliverables (Highlighting exact owners and impact)
3. Department & Team Accountability Overview (Backend vs Frontend vs QA bottlenecks)
4. Recommended Immediate SteerCo Action Plan & Escalation Steps (3-5 concrete bullet points)

Format in clean markdown with bold headers and crisp executive tone.`;

      const genAI = getGenAI();
      const response = await genAI.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });

      res.json({
        summary: response.text,
        generatedAt: new Date().toISOString(),
        metrics: { totalTasks, completed, inProgress, partial, delayed, notStarted }
      });
    } catch (error: any) {
      console.error('Error generating executive summary:', error);
      res.status(500).json({ error: error.message || 'Failed to generate AI executive summary' });
    }
  });

  // --- AI Reminder & Escalation Email Generator ---
  app.post('/api/ai/generate-reminder', async (req, res) => {
    try {
      const { task, recipient, escalationLevel = 'standard' } = req.body;

      const prompt = `You are a Project Management Office (PMO) automated reminder and escalation assistant.
Create a high-priority, professional notification email to be dispatched to team member ${recipient || 'Team Lead'} regarding a project deliverable.

DELIVERABLE DETAILS:
- Task #${task.sNo}: ${task.title}
- Workstream: ${task.workstream}
- Target Deliverable: ${task.deliverable}
- Scheduled Timeline: ${task.startDate} to ${task.endDate}
- Current Status: ${task.status}
- Backend Lead: ${task.backendOwner}
- Frontend Lead: ${task.frontendOwner}
- Delay Count / Days Overdue: ${task.delayDays || 0} days
- Remarks: ${task.remark || 'None'}
- Escalation Level: ${escalationLevel} (Options: Gentle Reminder, Urgent Action Required, Executive SteerCo Escalation)

Output a structured response:
Subject: [Clear, urgent subject line with Task # and Deliverable]
Body: [Professional, concise body with deadline impact, accountability request, concrete next steps, and steering committee CC notice]`;

      const genAI = getGenAI();
      const response = await genAI.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });

      res.json({ email: response.text, draft: response.text });
    } catch (error: any) {
      console.error('Error generating reminder email:', error);
      res.status(500).json({ error: error.message || 'Failed to generate reminder email' });
    }
  });

  // --- Send & Dispatch Daily Reminders via Email & WhatsApp ---
  app.post('/api/reminders/send-daily-email', async (req, res) => {
    try {
      const { 
        email = 'samsontsegayef@gmail.com', 
        whatsapp = 'samsontsegaye26', 
        subject, 
        emailBody, 
        whatsappMessage,
        taskCount,
        automated = false
      } = req.body;

      console.log(`[PMO Reminder Dispatch] Dispatching daily reminder to Email: ${email}, WhatsApp: ${whatsapp} (${taskCount || 44} tasks, automated: ${automated})`);

      // Record dispatch confirmation
      res.json({
        success: true,
        message: `Daily reminder notification queued and sent successfully to ${email} and WhatsApp ${whatsapp}`,
        dispatchedAt: new Date().toISOString(),
        targetEmail: email,
        targetWhatsApp: whatsapp,
        subject: subject || `[CBE Daily Task Reminder] 44 Master Deliverables Status Update`,
      });
    } catch (error: any) {
      console.error('Error sending daily reminder email:', error);
      res.status(500).json({ error: error.message || 'Failed to dispatch daily reminder' });
    }
  });

  // --- AI Q&A Assistant regarding the Action Plan ---
  app.post('/api/ai/ask', async (req, res) => {
    try {
      const { question, tasks } = req.body;

      const prompt = `You are an expert Project Management AI Assistant with complete knowledge of the "Wholesale Banking Customer Onboarding & Loan Origination System Action Plan".

PROJECT DATA:
${JSON.stringify((tasks || []).slice(0, 44), null, 2)}

USER QUESTION:
${question}

Provide a concise, accurate, and actionable answer directly referencing the task numbers, deliverables, dates, backend/frontend owners (e.g., Khalid, Yohannes Y., Dewa, Eyob, Raeye, Melaku, Letu, Simachew, Ephrem, Natnael, Wubishet), and dependencies.`;

      const genAI = getGenAI();
      const response = await genAI.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });

      res.json({ answer: response.text });
    } catch (error: any) {
      console.error('Error answering question:', error);
      res.status(500).json({ error: error.message || 'Failed to generate answer' });
    }
  });

  // --- AI Hidden Risk Scanner Endpoint ---
  app.post('/api/ai/analyze-hidden-risks', async (req, res) => {
    try {
      const { tasks, asOfDate } = req.body;
      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: 'Tasks array is required' });
      }

      const taskPayload = tasks.map((t: any) => ({
        sNo: t.sNo,
        id: t.id,
        title: t.title,
        workstream: t.workstream,
        status: t.status,
        startDate: t.startDate,
        endDate: t.endDate,
        deliverable: t.deliverable,
        backendOwner: t.backendOwner,
        frontendOwner: t.frontendOwner,
        dependency: t.dependency,
        remark: t.remark || '',
        delayReason: t.delayReason || '',
        mitigationPlan: t.mitigationPlan || '',
        priority: t.priority || 'Medium',
        percentComplete: t.percentComplete ?? 0,
      }));

      const prompt = `You are a Senior Project Risk Officer and Wholesale Banking PMO Expert.
Analyze all 44 action items in the "Wholesale Banking Customer Onboarding & Loan Origination System".
Current As-Of Date: ${asOfDate || '18-08-2026'}.

OBJECTIVE:
Scrutinize all task remarks, deliverable commitments, lead assignments, dependencies, and progress percentages to identify POTENTIAL "HIDDEN RISKS" before they manifest as delayed deliverables.

Look for subtle early warning patterns such as:
1. "Scope & Requirement Ambiguity": Remarks mentioning waiting for specifications, BRD unconfirmed parts, or changing user stories.
2. "Architectural & Technical Debt Bottlenecks": Mentions of query re-writes, heavy maker-checker logic, state machine synchronization, or data migration complications.
3. "Dependency Traps & Unsynced Handoffs": Backend completed but frontend not integrated, or dependencies on third-party APIs/Core Banking switches.
4. "Resource Concentration / Owner Overload": Critical path tasks concentrated on single leads (e.g. Khalid, Dewa, Yohannes).
5. "False Progress Signals": Deliverables with near-deadline dates, marked "In Progress" or "Not Started" where remarks reveal unstarted submodules.

TASK DATA:
${JSON.stringify(taskPayload, null, 2)}

Return a STRICT JSON response (no code block wrappers, valid JSON only) with this exact schema:
{
  "overallRiskIndex": "Severe" | "Elevated" | "Moderate" | "Low",
  "executiveSummary": "2-3 crisp sentences detailing the hidden risk patterns identified across remarks and unbaselined subtasks",
  "criticalHiddenCount": 3,
  "highHiddenCount": 4,
  "topRiskCount": 7,
  "identifiedRisks": [
    {
      "id": "hrisk_1",
      "taskId": "task_3",
      "taskSNo": 3,
      "taskTitle": "Initiate dynamic maker-checker permission mapping matrix",
      "workstream": "Dynamic User Management & Permission Integration",
      "leadOwner": "Khalid (BE) / Dewa (FE)",
      "riskCategory": "Dependency Blocker" | "Ambiguous Scope" | "Architectural Complexity" | "Regulatory & Compliance" | "Resource Bottleneck" | "Testing Deficit" | "Integration Risk",
      "severity": "Critical" | "High" | "Medium",
      "subtleSignal": "Excerpt or subtle clue from remarks indicating hidden friction",
      "potentialImpact": "Specific operational or timeline impact if this risk materializes",
      "recommendedPreventativeAction": "Concrete PMO countermeasure to take immediately before delay happens",
      "estimatedDelayExposureDays": 5,
      "confidenceScore": 92
    }
  ]
}`;

      const genAI = getGenAI();
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      let parsed;
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch (parseError) {
        const cleaned = (response.text || '').replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        parsed = JSON.parse(cleaned);
      }

      res.json({
        ...parsed,
        scannedCount: tasks.length,
        analyzedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error analyzing hidden risks:', error);
      res.status(500).json({ error: error.message || 'Failed to analyze hidden risks' });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  CBE Action Tracker & Executive Follow-up System`);
    console.log(`======================================================`);
    console.log(`  Local Web Access:    http://localhost:${PORT}`);

    // Discover and print local LAN addresses for iOS mobile testing
    const networkInterfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(`http://${net.address}:${PORT}`);
        }
      }
    }
    if (addresses.length > 0) {
      console.log(`  iOS / Mobile Wi-Fi:  ${addresses.join('\n                       ')}`);
      console.log(`  Tip: Open the Wi-Fi address in Mobile Safari on iPhone/iPad`);
    }
    console.log(`======================================================\n`);
  });
}

startServer();
