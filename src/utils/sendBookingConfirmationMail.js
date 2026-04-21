import transporter from "../config/nodemailer.config.js";

const sendGmail = async (to, subject, html) => {
    return transporter.sendMail({
        from: process.env.SMTP_USER_ID,
        to: to,
        subject: subject,
        html: html,
    });
};


export default sendGmail;
