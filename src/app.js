import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credential: true,
    })
);

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true,
    })
);

app.use(cookieParser());

// routes
import authRoute from "./routes/auth.route.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

app.use("/api/v1/auth", authRoute);
app.use(errorHandler);

export { app };
