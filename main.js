import express from "express";
import mongoose from "mongoose";
import { analyze } from "./analyze.js";
import { generateBunnyMessage, completeOnboarding, generatePlan } from "./bunnyService.js";
import dotenv from "dotenv";
dotenv.config();


const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.json({ limit: "1mb" }));

app.get("/ai-bunny/report/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await analyze(userId);
        if (!result) {
            return res.status(500).json({ error: "Analysis failed" });
        }
        return res.json({ success: true, data: result });
    } catch (err) {
        console.error("Error in /ai-bunny/report:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
//Context values for /ai-bunny/details/:userId endpoint
// [
//     'TASK_COMPLETE', 'TASK_SKIP', 'GREETING',
//     'COMEBACK', 'WEAK_TOPIC_FLAGGED',
//     'PLAN_GENERATED', 'INACTIVITY', 'EXAM_EVE', 'EXAM_DAY',
//   ]
app.get("/ai-bunny/details/:userId", async (req, res) => {
    try {
        const { studentName, bunnyName, bunnyState, context, contextData } = req.query;
       const result = await generateBunnyMessage({ studentName, bunnyName, bunnyState, context, contextData });
       console.log("Generated Bunny Message:", result);
        return res.json({ success: true, data: result });
    } catch (err) {
        console.error("Error in /ai-bunny/details:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/ai-bunny/generate-plan/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        console.log("Generating plan for userId:", userId);
       const result = await generatePlan(userId);
       console.log("Generated Plan:", result);
        return res.json({ success: true, data: result });
    } catch (err) {
        console.error("Error in /ai-bunny/generate-plan:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/ai-bunny/onboarding/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { examTarget, examDate, dailyHours } = req.body;
       const result = await completeOnboarding(userId, { examTarget, examDate, dailyHours });
       console.log("Onboarding completed:", result);
        return res.json({ success: true, data: result });
    } catch (err) {
        console.error("Error in /ai-bunny/onboarding:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGO_DB || "ai_bunny";

mongoose.connect(`${MONGO_URI}/${DB_NAME}`).then(() => {
    console.log("Mongoose connected to", DB_NAME);
    app.listen(PORT, () => {
        console.log(`Server running on : ${PORT}`);
    });
}).catch((err) => {
    console.error("Mongoose connection error:", err.message);
    process.exit(1);
});