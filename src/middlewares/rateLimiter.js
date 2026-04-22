import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisConnection from "../config/redis.config.js";
import { ApiError } from "../utils/apiError.js";

const globalRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redisConnection.call(...args),
    }),
    handler: (req, res, next, options) => {
        return next(
            new ApiError(
                options.statusCode || 429,
                "Too many Requests , Please wait before trying again"
            )
        );
    },
});

const authRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redisConnection.call(...args),
    }),
    handler: (req, res, next, options) => {
        return next(
            new ApiError(
                options.statusCode || 429,
                "Too Many Requests , Please wait before you try Again"
            )
        );
    },
});

const bookingRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 3,
    keyGenerator: (req) => `booking:${req.userId} || ${ipKeyGenerator(req)}`,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redisConnection.call(...args),
    }),
    handler: (req, res, next, options) => {
        return next(
            new ApiError(
                options.statusCode || 429,
                "Too Many Requests , Plese wait before booking ticket"
            )
        );
    },
});

const searchRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redisConnection.call(...args),
    }),
    handler: (req, res, next, options) => {
        return next(
            new ApiError(
                options.statusCode || 429,
                "Too Many Requests, Please SEarch in a while"
            )
        );
    },
});

export {
    globalRateLimiter,
    authRateLimiter,
    bookingRateLimiter,
    searchRateLimiter,
};
