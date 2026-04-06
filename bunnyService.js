// const { client } = require("./analyze.js");
import { client } from "./analyze.js";
import { Student } from "./studentName.js";
import { BunnyState } from "./bunnyState.js";
import { UserAnalysis } from "./UserPerfomace.js";
import { Plan } from "./dailyPlan.js";
import { Types } from "mongoose";
import dayjs from "dayjs";
import dotenv from "dotenv";
dotenv.config();

async function generateBunnyMessage(params) {
  const { studentName, bunnyName, bunnyState, context, contextData } = params;

  const animationMap = {
    TASK_COMPLETE: "CELEBRATE_BOUNCE",
    TASK_SKIP: "SAD_DROOP",
    STREAK_MILESTONE: "STAR_SPARKLE",
    COMEBACK: "HAPPY_WIGGLE",
    PLAN_GENERATED: "EXCITED_JUMP",
    INACTIVITY: "TIRED_BOB",
    WEAK_TOPIC_FLAGGED: "THINKING_POSE",
    GREETING: "IDLE_BOB",
    PRE_MOCK: "DETERMINED_POSE",
    POST_MOCK: "CELEBRATE_BOUNCE",
    EXAM_EVE: "CALM_BREATHE", // ← new
    TASK_COMPLETE_STREAK: "STAR_SPARKLE", // ← new
    ALL_TASKS_DONE: "CELEBRATE_BOUNCE", // ← new
  };

  // ── Time-of-day slot ──────────────────────────────────────────────
  const hour = new Date().getHours();
  const timeSlot =
    hour >= 5 && hour < 12
      ? "MORNING"
      : hour >= 12 && hour < 17
        ? "AFTERNOON"
        : hour >= 17 && hour < 21
          ? "EVENING"
          : "NIGHT";

  const timeOfDayTone = {
    MORNING: "Energy is fresh. Be upbeat and rally them into the day.",
    AFTERNOON:
      "Post-lunch lull is real. Be motivating but grounded — no hollow hype.",
    EVENING:
      "They are winding down or in a final session. Be warm and acknowledge the effort.",
    NIGHT:
      "It is late. Be calm, gentle, and brief. Never add pressure. Nudge rest if context allows.",
  };

  // ── Persona tone from student preference ─────────────────────────
  // contextData.messageTone: 'calm' | 'normal' | 'hype'
  const tonePref = contextData?.messageTone ?? "normal";
  const toneInstruction = {
    calm: "Tone: Soft, reassuring, never exclamatory. Like a patient friend.",
    normal:
      "Tone: Warm and encouraging. Natural energy — not flat, not over the top.",
    hype: "Tone: High energy, punchy, uses emphasis. Like a coach who genuinely believes in them.",
  };

  // ── Language preference ───────────────────────────────────────────
  // contextData.language: 'en' | 'hi'
  const language = contextData?.language ?? "en";
  const languageInstruction =
    language === "hi"
      ? "Write in simple conversational Hindi (Devanagari script). Keep it warm and natural, not formal."
      : "Write in English.";

  // ── Days to exam urgency layer ────────────────────────────────────
  const daysToExam = contextData?.daysToExam ?? null;
  let urgencyNote = "";
  if (daysToExam !== null) {
    if (daysToExam <= 1)
      urgencyNote =
        "Exam is tomorrow or today. Be calm and grounding, not hype.";
    else if (daysToExam <= 7)
      urgencyNote = `Exam is in ${daysToExam} days. Focused urgency — every session matters.`;
    else if (daysToExam <= 30)
      urgencyNote = `Exam in ${daysToExam} days. Steady urgency — consistent effort over sprints.`;
    // else: no urgency note, exam is far away
  }

  const prompt = `
You are ${bunnyName}, a warm study companion bunny for ${studentName}.
Current emotional state: ${bunnyState}
Time of day: ${timeSlot} — ${timeOfDayTone[timeSlot]}
${urgencyNote ? `Exam urgency: ${urgencyNote}` : ""}
${toneInstruction[tonePref]}
${languageInstruction}
Context: ${context}
Relevant data: ${JSON.stringify(contextData)}

Write exactly ONE message (max 2 sentences).

Rules:
- Warm, personal — reference the specific data above (topic name, score, streak count etc.)
- Let the time-of-day tone shape your energy level and word choice
- Emoji: end with 1 emoji that fits the time (🌅 morning / ☀️ afternoon / 🌆 evening / 🌙 night)
  unless the context calls for a stronger one (🔥 streak / 🎉 milestone / 💛 skip)
- NEVER use these words: fail, wrong, bad, disappointing, lazy, terrible, stupid
- NEVER give generic advice ("keep going!", "you can do it!") — always be specific to the data

Context-specific rules:
- TASK_COMPLETE      → celebrate the exact topic and score, mention improvement if delta is positive
- TASK_SKIP         → be understanding, never guilt, offer a gentle reschedule nudge
- STREAK_MILESTONE  → be genuinely excited, name the streak number
- INACTIVITY + NIGHT → suggest rest, not more study
- INACTIVITY + other → gentle nudge, name the next pending task if available
- GREETING + MORNING → open with energy, name the first task from their plan
- GREETING + NIGHT   → short, calm, wind-down energy
- ALL_TASKS_DONE    → big celebration, acknowledge the full day's work
- EXAM_EVE          → calm and grounding, remind them what they have already built
- PRE_MOCK          → focus and confidence, short
- POST_MOCK         → acknowledge the attempt, pivot immediately to "let's see what to fix"

Reply with only the message. No quotes. No explanation. No preamble.
`.trim();

  try {
    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [
        // {
        //     role: "system",
        //     content: "You are an expert student performance analyst for JEE/NEET.",
        // },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0].message.content
      ? response.choices[0].message.content.trim()
      : "";

    return {
      message:
        text || this.getFallbackBunnyMessage(context, bunnyName, timeSlot),
      animation: animationMap[context] ?? "IDLE_BOB",
    };
  } catch (err) {
    console.error("Bunny message generation failed", err);
    return {
      message: this.getFallbackBunnyMessage(context, bunnyName, timeSlot),
      animation: animationMap[context] ?? "IDLE_BOB",
    };
  }
}

async function completeOnboarding(studentId, body) {
  const sid = new Types.ObjectId(studentId);

  await Student.findByIdAndUpdate(
    sid,
    {
      $set: {
        examTarget: body.examTarget,
        examDate: body.examDate,
        dailyHours: body.dailyHours,
        phone: "7906962743",
        onboardingComplete: true,
      },
    },
    { upsert: true, new: true },
  );

  await BunnyState.findOneAndUpdate(
    { studentId: sid },
    {
      $setOnInsert: {
        studentId: sid,
        bunnyName: "Bunny",
        happinessScore: 55,
        emotionalState: "NEUTRAL",
        evolutionStage: "BABY_BUNNY",
        streakDays: 0,
        carrotsTotal: 0,
      },
    },
    { upsert: true, new: true },
  );

  return { onboardingComplete: true, redirectTo: "dashboard" };
}

async function generatePlan(studentId) {
  const sid = new Types.ObjectId(studentId);

  console.log("Fetching data for plan generation, studentId:", studentId);
  const [student, userAnalysis, bunnyState] = await Promise.all([
    Student.findById(sid).lean(),
    UserAnalysis.findOne({ userId: studentId }).lean(),
    BunnyState.findOne({ studentId: sid }).lean(),
  ]);
  console.log(student, userAnalysis, bunnyState);

  // Flatten weakTopics Map (keyed by batchId) into a single array
  const weakTopicsMap = userAnalysis?.weakTopics ?? {};
  const weakTopicsList = Object.values(weakTopicsMap)
    .flat()
    .map((t) => ({
      topic: t.topicDetails?.name ?? t.chapterDetails?.name ?? "Unknown",
      subject: t.subjectDetails?.name ?? "Unknown",
      chapter: t.chapterDetails?.name ?? "Unknown",
    }));

  const daysToExam = student?.examDate
    ? dayjs(student.examDate).diff(dayjs(), "day")
    : 90;

  // Task count based on available hours
  const dailyHours = student?.dailyHours ?? 4;
  const taskCount = Math.min(Math.max(Math.round(dailyHours * 1.5), 4), 8);

  const aiTasks = await generateDailyPlan({
    studentName: student?.name ?? "Student",
    examTarget: student?.examTarget ?? "JEE_MAIN",
    daysToExam,
    dailyHours,
    bunnyHappiness: bunnyState?.happinessScore ?? 50,
    weakTopics: weakTopicsList,
    taskCount,
  });

  const today = dayjs().startOf("day").toDate();

  const plan = await Plan.findOneAndUpdate(
    { studentId: sid, planDate: today },
    {
      $set: {
        tasks: aiTasks,
        totalTasks: aiTasks.length,
        estimatedMinutes: aiTasks.reduce(
          (s, t) => s + (t.durationMin ?? 15),
          0,
        ),
        generatedBy: "AI",
      },
    },
    { upsert: true, new: true },
  );

  return plan;
}

async function generateDailyPlan(params) {
  const {
    studentName,
    examTarget,
    daysToExam,
    dailyHours,
    bunnyHappiness,
    weakTopics,
    taskCount,
  } = params;
  console.log("Generating plan with params:", weakTopics);
  const moodNote =
    bunnyHappiness < 30
      ? "Student is demotivated. Start with 1 short easy task (5–8 min) as a confidence builder."
      : bunnyHappiness > 80
        ? "Student is on a streak and energised. Include at least one challenging task."
        : "";

  const prompt = `
You are a ${examTarget} study planner for ${studentName}.
Exam in ${daysToExam} days. Available today: ${dailyHours} hours.
${moodNote}

Weak topics to address (priority order):
${weakTopics
  .map((t, i) => `${i + 1}. ${t.topic} — ${t.chapter} (${t.subject})`)
  .join("\n")}

Rules:
- Generate exactly ${taskCount} micro-tasks (5-20 min each)
- Balance across subjects (no subject > 45% of total time)
- Match tool to error type:
    C1_CONCEPTUAL    → NCERT_PITARA or LECTURE_REWATCH
    C2_PROCEDURAL    → INFINITE_PRACTICE (easy difficulty)
    C3_CALCULATION   → INFINITE_PRACTICE (timed)
    C6_CARELESS      → INFINITE_PRACTICE (timed, medium)
    improving topics → CHAPTER_TEST or PYQ_PRACTICE
- ${daysToExam < 14 ? "Exam close: prioritise revision and PYQ. No new topics." : ""}
- ${daysToExam < 30 ? "Include at least 1 mock-style task." : ""}

Return ONLY a valid JSON array. No explanation. No markdown.
[
  {
    "taskType": "PRACTICE|VIDEO|REVISION|MOCK",
    "tool": "DPP|INFINITE_PRACTICE|CHAPTER_TEST|NCERT_PITARA|PYQ_PRACTICE|LECTURE_REWATCH|REAL_TEST|BATTLEGROUND",
    "subject": "PHYSICS|CHEMISTRY|MATHEMATICS|BIOLOGY",
    "topic": "string",
    "description": "string (specific, actionable, max 80 chars)",
    "durationMin": number,
    "difficulty": "EASY|MEDIUM|HARD",
    "priority": number,
    "pwDeepLink": "pw://tool-name?topic=slug&difficulty=easy"
  }
]
`.trim();

  try {
    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0].message.content
      ? response.choices[0].message.content.trim()
      : "";

    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error("Plan generation failed", err);
    return this.getFallbackPlan(weakTopics, taskCount);
  }
}

export { generateBunnyMessage, completeOnboarding, generatePlan };
