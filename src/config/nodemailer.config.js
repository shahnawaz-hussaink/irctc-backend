import "dotenv/config"; 
import nodeMailer from "nodemailer";

const transporter = nodeMailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER_ID,
        pass: process.env.SMTP_PASS,
    },
});




export default transporter;
