import './src/config/env.config.js'
import { app } from "./src/app.js";


const port = 8000 || process.env.PORT


app.listen(port,()=>{
    console.log(`App is listening on port : ${port}`)
})