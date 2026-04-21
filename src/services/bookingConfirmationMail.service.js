import bookingConfirmationMailQueue from "../queues/bookingConfirmationMailQueue.queue.js";

const bookingConfirmationMail = async (to, bookingId) => {
    await bookingConfirmationMailQueue.add("bookingConfirmationMailQueue", {
        to,
        bookingId,
    });
    console.log("Job Added to MailQueue");
};

export default bookingConfirmationMail;
