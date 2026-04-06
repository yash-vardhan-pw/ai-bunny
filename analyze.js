import fs from "fs";
import dotenv from "dotenv";
import { AzureOpenAI } from "openai";
import clickHouseClient from "./clickhouse.js";
import redis from "./redisClient.js";
import { insertUserAnalysis, closeMongo } from "./mongo.js";
dotenv.config();

const QBG_BASE_URL = "https://qbg-backend-stage.penpencil.co/qbg";
const REDIS_TTL = 5 * 86400; // 5 days

const client = new AzureOpenAI({
  apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

async function fetchWithCache(type, id) {
  if (!id || id === "NA") return null;

  const cacheKey = `${type}:${id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = `${QBG_BASE_URL}/${type}/details/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Failed to fetch ${type} details for ${id}: ${res.status}`);
    return null;
  }
  const data = await res.json();
  const finalData = {
    tag: data?.data?.tag,
    name: data?.data?.name,
    slug: data?.data?.slug,
    versions: data?.data?.versions,
  };
  await redis.set(cacheKey, JSON.stringify(finalData), "EX", REDIS_TTL);
  return finalData;
}

async function enrichWeakTopics(analysisResult) {
  const subjectCache = {};
  const chapterCache = {};
  const topicCache = {};

  for (const userId of Object.keys(analysisResult)) {
    const userEntry = analysisResult[userId];
    if (!userEntry.weakTopics) continue;

    for (const batchId of Object.keys(userEntry.weakTopics)) {
      const topics = userEntry.weakTopics[batchId];

      for (const entry of topics) {
        // Subject
        if (entry.subjectId && entry.subjectId !== "NA") {
          if (!subjectCache[entry.subjectId]) {
            subjectCache[entry.subjectId] = await fetchWithCache(
              "subjects",
              entry.subjectId,
            );
          }
          entry.subjectDetails = subjectCache[entry.subjectId];
        }

        // Chapter
        if (entry.chapterId && entry.chapterId !== "NA") {
          if (!chapterCache[entry.chapterId]) {
            chapterCache[entry.chapterId] = await fetchWithCache(
              "chapters",
              entry.chapterId,
            );
          }
          entry.chapterDetails = chapterCache[entry.chapterId];
        }

        // Topic
        if (entry.topicId && entry.topicId !== "NA") {
          if (!topicCache[entry.topicId]) {
            topicCache[entry.topicId] = await fetchWithCache(
              "topics",
              entry.topicId,
            );
          }
          entry.topicDetails = topicCache[entry.topicId];
        }
      }
    }
  }

  return analysisResult;
}

const prompt = fs.readFileSync("./prompt2.txt", "utf-8");

async function analyze(userId) {
  const cacheKey = `ai-bunny:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log("Returning cached analysis result");
    return JSON.parse(cached);
  }
  const clickHouseQuery = `select * from time_series.test_result_reports 
where user_id IN ('${userId}') and batch_id != 'NA'
AND created_at >= now() - INTERVAL 60 DAY`;

  const rowCountResult = await clickHouseClient.query({
    query: clickHouseQuery,
    format: "JSONEachRow",
  });

  const jsonData = await rowCountResult.json();
  console.log("Data fetched from ClickHouse:", jsonData.length, "rows");
  const finalPrompt = `
${prompt}

${JSON.stringify(jsonData, null, 2)}
`;

  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      {
        role: "system",
        content: "You are an expert student performance analyst for JEE/NEET.",
      },
      {
        role: "user",
        content: finalPrompt,
      },
    ],
    temperature: 0.3,
  });

  const aiContent = response.choices[0].message.content;
  // console.log("===== RAW AI ANALYSIS =====");
  // console.log(aiContent);

  // // Extract JSON from the AI response (may be wrapped in markdown code block)
  //     const aiContent = `{
  //   "675459698fc4236919170080": {
  //     "userId": "675459698fc4236919170080",
  //     "tier": "T3",
  //     "bunny_state": "Neutral",
  //     "weakTopics": {
  //       "6780000a756a63502dcf0743": [
  //         {
  //           "topicId": "NA",
  //           "subjectId": "dvdy4c602ajwwe2cxckb5vn42",
  //           "chapterId": "qno1t0pqftdni7cxm9ad2omck"
  //         },
  //         {
  //           "topicId": "o2dk2l3ie309q0o0maehv6qal",
  //           "subjectId": "iydv16vvyph4i0hajzqbqxk2t",
  //           "chapterId": "t0l8btj327ht3t34rfxsp9qbl"
  //         },
  //         {
  //           "topicId": "2kor680hh7bq70jpch9p7p3bk",
  //           "subjectId": "iydv16vvyph4i0hajzqbqxk2t",
  //           "chapterId": "0rrarapopbsgfvsdhwnud0gzt"
  //         }
  //       ],
  //       "618e0429668d2700112970ea": [
  //         {
  //           "topicId": "NA",
  //           "subjectId": "734chcfe1nhx5ay0lh0n5d4qj",
  //           "chapterId": "873z5ilvqklk7n4508ncjr5ne"
  //         },
  //         {
  //           "topicId": "2kor680hh7bq70jpch9p7p3bk",
  //           "subjectId": "iydv16vvyph4i0hajzqbqxk2t",
  //           "chapterId": "0rrarapopbsgfvsdhwnud0gzt"
  //         },
  //         {
  //           "topicId": "o2dk2l3ie309q0o0maehv6qal",
  //           "subjectId": "iydv16vvyph4i0hajzqbqxk2t",
  //           "chapterId": "t0l8btj327ht3t34rfxsp9qbl"
  //         }
  //       ]
  //     },
  //     "userPerformance": {
  //       "accuracy": {
  //         "overall_percent": "68.42%",
  //         "correct_questions": 13,
  //         "total_attempted": 19,
  //         "marks_obtained": 55,
  //         "total_marks": 522,
  //         "avg_time_per_question_sec": 2.47,
  //         "level": "Medium"
  //       },
  //       "consistency": {
  //         "status": "Inconsistent",
  //         "variance_description": "Accuracy fluctuates from 0% to 100% across attempts, with several zero-attempt records and mixed outcomes in attempted records.",
  //         "accuracy_range": "0% - 100%"
  //       }
  //     }
  //   }
  // }`;

  let analysisResult;
  try {
    const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
    analysisResult = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", e.message);
    await redis.quit();
    return;
  }

  const enriched = await enrichWeakTopics(analysisResult);

  console.log("===== ENRICHED ANALYSIS =====");
  // console.log(JSON.stringify(enriched, null, 2));

  await insertUserAnalysis(enriched);

  // await redis.quit();/
  // await closeMongo();

  await redis.set(cacheKey, JSON.stringify(enriched), "EX", REDIS_TTL);
  return enriched;
}

export { analyze, client };
