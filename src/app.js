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
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import authRoute from "./routes/user.route.js";
import adminRoute from './routes/admin.route.js'


app.use("/api/v1/user", authRoute);
app.use("/api/v1/admin", adminRoute)
app.use(errorHandler);

export { app };
