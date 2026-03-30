// Sunshine Heartbeat Service
// Proactive AI that wakes up on a schedule and generates briefings/alerts
// Inspired by OpenClaw's heartbeat daemon — acts without being prompted.

import cron from "node-cron";
import { storage } from "./storage";

async function generateDailyBriefing(userId: string): Promise<void> {
  try {
    const [tasks, grants, memories] = await Promise.all([
      storage.getTasks(userId).catch(() => []),
      storage.getGrants(userId).catch(() => []),
      storage.getSunshineMemories(userId).catch(() => [])
    ]);

    const now = new Date();
    const overdueTasks = tasks.filter((t: any) => {
      if (!t.dueDate || t.status === "completed") return false;
      return new Date(t.dueDate) < now;
    });

    const upcomingDeadlines = tasks.filter((t: any) => {
      if (!t.dueDate || t.status === "completed") return false;
      const due = new Date(t.dueDate);
      const daysAway = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysAway >= 0 && daysAway <= 3;
    });

    const activeGrants = grants.filter((g: any) => g.status === "in_progress" || g.status === "submitted");
    const pendingTasks = tasks.filter((t: any) => t.status === "pending" || t.status === "in_progress");
    const highPriorityTasks = pendingTasks.filter((t: any) => t.priority === "high");

    // Only create a briefing if there's something worth reporting
    const hasContent = overdueTasks.length > 0 || upcomingDeadlines.length > 0 || highPriorityTasks.length > 0;
    if (!hasContent && pendingTasks.length === 0) return;

    const lines: string[] = [];
    lines.push(`Good morning! ☀️ Here's your daily briefing for ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.\n`);

    if (overdueTasks.length > 0) {
      lines.push(`**⚠️ Overdue (${overdueTasks.length}):** ${overdueTasks.slice(0, 3).map((t: any) => t.title).join(", ")}${overdueTasks.length > 3 ? " and more" : ""}.`);
    }

    if (upcomingDeadlines.length > 0) {
      lines.push(`**📅 Due soon (${upcomingDeadlines.length}):** ${upcomingDeadlines.slice(0, 3).map((t: any) => t.title).join(", ")}.`);
    }

    if (highPriorityTasks.length > 0) {
      lines.push(`**🔴 High priority:** ${highPriorityTasks.slice(0, 3).map((t: any) => t.title).join(", ")}.`);
    }

    if (activeGrants.length > 0) {
      lines.push(`**💰 Active grants:** ${activeGrants.length} grant${activeGrants.length !== 1 ? "s" : ""} in progress.`);
    }

    const carenMemory = memories.find((m: any) => m.key.includes("caren") || m.category === "project");
    if (carenMemory) {
      lines.push(`\n**🚀 C.A.R.E.N. note:** ${carenMemory.value}`);
    }

    lines.push(`\nYou have **${pendingTasks.length}** tasks total. Talk to me to prioritize your day!`);

    await storage.createHeartbeatAlert({
      userId,
      title: `Daily Briefing — ${now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
      message: lines.join("\n"),
      alertType: "briefing",
      read: false
    });
  } catch (err) {
    console.error("[Heartbeat] Daily briefing error:", err);
  }
}

async function checkDeadlineAlerts(userId: string): Promise<void> {
  try {
    const tasks = await storage.getTasks(userId).catch(() => []);
    const now = new Date();

    for (const task of tasks as any[]) {
      if (!task.dueDate || task.status === "completed") continue;
      const due = new Date(task.dueDate);
      const hoursAway = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Alert for tasks due within 24 hours that aren't done
      if (hoursAway > 0 && hoursAway <= 24) {
        const existingAlerts = await storage.getHeartbeatAlerts(userId, false);
        const alreadyAlerted = existingAlerts.some(a =>
          a.alertType === "deadline" && a.title.includes(task.title)
        );
        if (!alreadyAlerted) {
          await storage.createHeartbeatAlert({
            userId,
            title: `⏰ Due today: ${task.title}`,
            message: `**"${task.title}"** is due in ${Math.round(hoursAway)} hours.\n\nPriority: ${task.priority || "normal"}${task.description ? `\n\n${task.description}` : ""}\n\nAsk me to help you work on this!`,
            alertType: "deadline",
            read: false
          });
        }
      }
    }
  } catch (err) {
    console.error("[Heartbeat] Deadline check error:", err);
  }
}

export async function runHeartbeatForAllUsers(): Promise<void> {
  try {
    // Get all users (we only have one in practice, but keep it general)
    const users = await (storage as any).getAllUsers?.() || [];

    // If no getAllUsers method, try to get the main user via the hardwired email
    if (users.length === 0) {
      const mainUser = await storage.getUserByEmail("lordenkizm@gmail.com").catch(() =>
        storage.getUserByEmail("admin@mylifeassistant.vip").catch(() => null)
      );
      if (mainUser) users.push(mainUser);
    }

    for (const user of users) {
      await generateDailyBriefing(user.id);
      await checkDeadlineAlerts(user.id);
    }
  } catch (err) {
    console.error("[Heartbeat] Error running for all users:", err);
  }
}

export function startHeartbeat(): void {
  console.log("[Heartbeat] ☀️ Starting Sunshine heartbeat system...");

  // Daily briefing at 8:00 AM
  cron.schedule("0 8 * * *", async () => {
    console.log("[Heartbeat] Running daily briefing...");
    await runHeartbeatForAllUsers();
  });

  // Deadline check every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    console.log("[Heartbeat] Checking deadlines...");
    await runHeartbeatForAllUsers();
  });

  console.log("[Heartbeat] ✅ Scheduled: daily briefing at 8am, deadline checks every 6h");
}
