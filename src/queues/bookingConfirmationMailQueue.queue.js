import { Queue } from "bullmq";
import redisConnection from "../config/redis.config.js";

const bookingConfirmationMailQueue = new Queue("bookingConfirmationMailQueue", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { count: 10 },
    },
});

export default bookingConfirmationMailQueue;
