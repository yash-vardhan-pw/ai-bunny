import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  taskType: { type: String, required: true, enum: ["PRACTICE", "VIDEO", "REVISION", "MOCK"] },
  tool: {
    type: String,
    required: true,
    enum: ["DPP", "INFINITE_PRACTICE", "CHAPTER_TEST", "NCERT_PITARA",
           "PYQ_PRACTICE", "LECTURE_REWATCH", "REAL_TEST", "BATTLEGROUND",
           "TOPIC_ASSIGNMENT", "SAARTHI"],
  },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  description: { type: String, required: true },
  durationMin: { type: Number, required: true, min: 5, max: 120 },
  difficulty: { type: String, enum: ["EASY", "MEDIUM", "HARD"] },
  priority: { type: Number, required: true },
  status: { type: String, default: "PENDING", enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"] },
  pwDeepLink: String,
  outcome: {
    accuracyPct: Number,
    questionsAttempted: Number,
    questionsCorrect: Number,
    timeSpentMin: Number,
    studentFeedback: String,
  },
  startedAt: Date,
  completedAt: Date,
});

const dailyPlanSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  planDate: { type: Date, required: true },
  tasks: { type: [taskSchema], default: [] },
  totalTasks: Number,
  estimatedMinutes: Number,
  generatedBy: { type: String, default: "AI", enum: ["AI", "MANUAL"] },
}, { timestamps: true, collection: "daily_plans" });

dailyPlanSchema.index({ studentId: 1, planDate: -1 });
dailyPlanSchema.index({ studentId: 1, planDate: 1 }, { unique: true });

const Plan = mongoose.model("Plan", dailyPlanSchema);

export { Plan };