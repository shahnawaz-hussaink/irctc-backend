import "./src/config/env.config.js";
import { app } from "./src/app.js";

const port = process.env.PORT || 8000;


app.listen(port, () => {
    console.log(`App is listening on port : ${port}`);
});
