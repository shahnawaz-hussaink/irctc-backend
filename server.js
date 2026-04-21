import "./src/config/env.config.js";
import { app } from "./src/app.js";
import "./src/worker/waitingList.worker.js";
import "./src/worker/bookingConfirmationMail.worker.js";

const port = process.env.PORT || 8000;


app.listen(port, () => {
    console.log(`App is listening on port : ${port}`);
});
