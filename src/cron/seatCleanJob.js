import { schedule } from "node-cron";
import seatCleanup from "../utils/seatCleanupCron.js";

const startCronJobs = () => {
    schedule("*/10 * * * * *", async () => {
        await seatCleanup();
        console.log("Expired seat locks cleared");
    });
};

export default startCronJobs;