import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

export default redis;
