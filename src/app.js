import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import startCronJobs from "./cron/seatCleanJob.js";

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

startCronJobs()

// routes
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import authRoute from "./routes/user.route.js";
import adminRoute from './routes/admin.route.js'



app.use("/api/v1/user", authRoute);
app.use("/api/v1/admin", adminRoute)
app.use(errorHandler);

export { app };
