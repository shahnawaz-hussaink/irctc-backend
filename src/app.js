import express from "express";
import cors from "cors";

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

// routes
import authRoute from './routes/auth.route.js'
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

app.use("/api/v1/auth",authRoute)
app.use(errorHandler)

export { app };
