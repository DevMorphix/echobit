// Text generation: Gemini 2.5 Flash via raw REST (drops @google/generative-ai)
// with fallback chain: Gemini retry → Workers AI Llama 3.3 70B (drops OpenAI
// entirely). Prompts ported verbatim from backend/config/gemini.js.

import { withRetry } from './retry.ts';
import type { Env } from '../types.ts';
import type { ActionItem } from '../lib/serialize.ts';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const FALLBACK_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const callGemini = async (env: Env, prompt: string): Promise<string> => {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const res = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
};

const callWorkersAiFallback = async (env: Env, prompt: string): Promise<string> => {
  const res = (await env.AI.run(FALLBACK_MODEL as keyof AiModels, {
    messages: [{ role: 'user', content: prompt }],
  })) as { response?: string };
  if (!res.response) throw new Error('Workers AI fallback returned an empty response');
  return res.response;
};

/** Gemini (with one retry) → Workers AI fallback. */
const generate = async (env: Env, prompt: string): Promise<string> => {
  try {
    return await withRetry(() => callGemini(env, prompt), { attempts: 2, label: 'gemini' });
  } catch (err) {
    console.warn('Gemini failed, falling back to Workers AI:', (err as Error).message);
    return callWorkersAiFallback(env, prompt);
  }
};

export const generateSummary = async (env: Env, transcript: string): Promise<string> => {
  if (!transcript || transcript.length < 50) {
    return 'Transcript too short to summarize. Please provide more content.';
  }

  const prompt = `You are an expert at summarizing audio recordings and meetings.
Please analyze the following transcript and provide a clear, concise summary.

IMPORTANT: Only include sections that have actual content from the transcript. If something wasn't discussed or mentioned, DO NOT include that section at all. Never write things like "No decisions were made" or "Not mentioned" - simply omit that section entirely.

Include ONLY if present in the transcript:
- Main topics discussed
- Key points and takeaways
- Decisions made (only if actual decisions were made)
- Important information mentioned
- no "----" in between any lines, JUST USE SPACING

Format the summary with clear sections using markdown.

Transcript:
"""
${transcript}
"""

Please provide a well-structured summary (only including sections with actual content):`;

  return generate(env, prompt);
};

export const generateMeetingMinutes = async (
  env: Env,
  transcript: string,
  summary: string,
  title: string,
  outputLanguage: string | null = null,
): Promise<string> => {
  if (!transcript || transcript.length < 50) {
    return 'Transcript too short to generate minutes. Please provide more content.';
  }

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const langInstruction = outputLanguage
    ? `OUTPUT LANGUAGE: Write the entire meeting minutes in ${outputLanguage}. Translate all content into ${outputLanguage}. Keep markdown formatting intact.`
    : `OUTPUT LANGUAGE: Write in English.`;

  const prompt = `You are an expert at creating professional meeting minutes.
Please analyze the following transcript and generate comprehensive meeting minutes.

Meeting Title: ${title || 'Untitled Meeting'}
Date: ${date}

${summary ? `Existing Summary:\n${summary}\n` : ''}

Transcript:
"""
${transcript}
"""

${langInstruction}

IMPORTANT RULES:
1. ONLY include sections that have actual content from the transcript
2. If something wasn't discussed or mentioned, DO NOT include that section at all
3. Never write "No decisions were made", "None mentioned", "Not specified", "N/A" etc. - simply OMIT the entire section
4. Only include attendees/speakers if actual names were mentioned
5. Only include action items if specific tasks were discussed
6. Only include decisions if actual decisions were reached
7. Only include next steps if they were explicitly mentioned
8. Don't add any "----" in between any lines, JUST USE SPACING

Create professional meeting minutes in markdown format. Start with:

# Meeting Minutes

**Meeting:** ${title || 'Untitled Meeting'}
**Date:** ${date}

---

Then ONLY include these sections if they have actual content:
- Attendees/Speakers (only if names mentioned)
- Topics Discussed (main subjects covered)
- Key Discussion Points (important details)
- Decisions Made (only if decisions were actually made)
- Action Items (only if specific tasks mentioned)
- Next Steps (only if follow-ups discussed)

End with:
---
*Minutes generated by Echobit* (dont mention gemini )  `;

  return generate(env, prompt);
};

export const extractActionItems = async (env: Env, transcript: string): Promise<ActionItem[]> => {
  if (!transcript || transcript.length < 50) return [];

  const prompt = `Analyze the following transcript and extract any action items, tasks, or to-dos mentioned.

Transcript:
"""
${transcript}
"""

Return the action items as a JSON array with objects containing:
- "task": the action item description
- "assignee": who should do it (or "Unassigned" if not mentioned)
- "priority": "high", "medium", or "low" based on context
- "deadline": any mentioned deadline (or null if not mentioned)

Return ONLY the JSON array, no other text.`;

  const parseItems = (text: string): ActionItem[] => {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? (JSON.parse(match[0]) as ActionItem[]) : [];
  };

  try {
    return parseItems(await generate(env, prompt));
  } catch (error) {
    console.error('Action items extraction failed:', error);
    return [];
  }
};

export const generateTitle = async (env: Env, transcript: string): Promise<string> => {
  const fallbackTitle = `Recording ${new Date().toLocaleDateString()}`;
  if (!transcript || transcript.length < 20) return fallbackTitle;

  const prompt = `You are an expert at creating concise, descriptive titles.
Analyze the following transcript and generate a short, professional title (max 60 characters) that captures the main topic or purpose.

Rules:
- Keep it concise (3-8 words ideal)
- Make it descriptive and specific to the content
- Do NOT include dates or timestamps
- Do NOT use generic titles like "Meeting" or "Discussion"
- Do NOT use quotes around the title
- Return ONLY the title, nothing else

Transcript:
"""
${transcript.substring(0, 2000)}
"""

Title:`;

  try {
    const title = (await generate(env, prompt)).trim().replace(/^["']|["']$/g, '');
    return title || fallbackTitle;
  } catch (error) {
    console.error('Title generation failed:', error);
    return fallbackTitle;
  }
};
