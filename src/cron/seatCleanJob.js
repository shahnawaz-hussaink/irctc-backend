import { schedule } from "node-cron";
import seatCleanup from "../utils/seatCleanupCron";

schedule("*/5 * * * *", async () => {
    await seatCleanup();
    console.log("Expired seat locks cleared");
});
