// Sunshine Memory Service
// Extracts key facts from conversations and persists them so Sunshine
// remembers context across sessions — similar to OpenClaw's local-first memory.

import { storage } from "./storage";

interface MemoryEntry {
  key: string;
  value: string;
  category: "project" | "contact" | "goal" | "preference" | "reminder" | "general";
}

// System prompt that extracts memorable facts from a conversation turn
const EXTRACTION_PROMPT = `You are a memory extraction system for an AI assistant named Sunshine.
Given a user message and Sunshine's response, extract any facts worth remembering long-term.
Only extract facts that would be useful in FUTURE conversations (not just this one).

Categories:
- "project": C.A.R.E.N. app progress, features, milestones, tech decisions
- "contact": investor names, music supervisors, radio contacts, grant contacts
- "goal": financial goals, release targets, business objectives
- "preference": communication style, workflow preferences, tools they like
- "reminder": recurring tasks, important dates, follow-ups
- "general": anything else worth knowing about the user

Return a JSON array of {key, value, category} objects. Max 5 facts per turn.
Return [] if nothing is worth remembering.
Keys should be short and unique (e.g. "caren_tech_stack", "investor_john_email").
Values should be concise but complete sentences.`;

export async function extractAndSaveMemory(
  userId: string,
  userMessage: string,
  aiResponse: string
): Promise<void> {
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: `User said: "${userMessage}"\n\nSunshine responded: "${aiResponse.slice(0, 500)}"`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
      temperature: 0.3
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return;

    const parsed = JSON.parse(content);
    const facts: MemoryEntry[] = Array.isArray(parsed) ? parsed : (parsed.facts || parsed.memories || []);

    for (const fact of facts.slice(0, 5)) {
      if (fact.key && fact.value) {
        await storage.setSunshineMemory(userId, fact.key, fact.value, fact.category || "general");
      }
    }
  } catch {
    // Memory extraction is non-critical — silently fail
  }
}

export async function formatMemoryForPrompt(userId: string): Promise<string> {
  try {
    const memories = await storage.getSunshineMemories(userId);
    if (memories.length === 0) return "";

    const grouped: Record<string, string[]> = {};
    for (const m of memories) {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(`${m.key}: ${m.value}`);
    }

    const sections = Object.entries(grouped)
      .map(([cat, items]) => `[${cat.toUpperCase()}]\n${items.join("\n")}`)
      .join("\n\n");

    return `\n\nLONG-TERM MEMORY (things I've learned about you over time):\n${sections}`;
  } catch {
    return "";
  }
}
