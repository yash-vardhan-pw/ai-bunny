import mongoose from "mongoose";

const versionSchema = new mongoose.Schema({
  name: String,
  language_id: String,
}, { _id: false });

const detailSchema = new mongoose.Schema({
  tag: String,
  name: String,
  slug: String,
  versions: [versionSchema],
}, { _id: false });

const weakTopicEntrySchema = new mongoose.Schema({
  topicId: String,
  subjectId: String,
  chapterId: String,
  subjectDetails: detailSchema,
  chapterDetails: detailSchema,
  topicDetails: detailSchema,
}, { _id: false });

const userAnalysisSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  tier: String,
  bunny_state: String,
  weakTopics: {
    type: Map,
    of: [weakTopicEntrySchema],
  },
  userPerformance: {
    accuracy: {
      overall_percent: String,
      correct_questions: Number,
      total_attempted: Number,
      marks_obtained: Number,
      total_marks: Number,
      avg_time_per_question_sec: Number,
      level: String,
    },
    consistency: {
      status: String,
      variance_description: String,
      accuracy_range: String,
    },
  },
}, { timestamps: true, collection: process.env.MONGO_COLLECTION || "user_analysis" });

userAnalysisSchema.index({ userId: 1 }, { unique: true });

const UserAnalysis = mongoose.model("UserAnalysis", userAnalysisSchema);

export { UserAnalysis };