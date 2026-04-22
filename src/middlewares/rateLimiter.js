import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisConnection from "../config/redis.config.js";
import { ApiError } from "../utils/apiError.js";

const createRateLimiter = (limit, message, keyGenerator) => {
    return rateLimit({
        windowMs: 60 * 1000,
        limit,
        keyGenerator,
        standardHeaders: true,
        legacyHeaders: false,
        store: new RedisStore({
            sendCommand: (...args) => redisConnection.call(...args),
        }),
        handler: (req, res, next, options) => {
            return next(new ApiError(options.statusCode || 429, message));
        },
    });
};

const globalRateLimiter = createRateLimiter(
    100,
    "Too many Requests , Please wait before trying again"
);

const authRateLimiter = createRateLimiter(
    10,
    "Too Many Requests , Please wait before you try Again"
);

const bookingRateLimiter = createRateLimiter(
    5,
    "Too Many Requests , Plese wait before booking ticket",
    (req) => `booking:${req.userId} || ${ipKeyGenerator(req)}`
);

const searchRateLimiter = createRateLimiter(
    5,
    "Too Many Requests, Please SEarch in a while",
    (req) => ipKeyGenerator(req)
);

export {
    globalRateLimiter,
    authRateLimiter,
    bookingRateLimiter,
    searchRateLimiter,
};
