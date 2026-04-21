import "dotenv/config";
import { Worker } from "bullmq";
import redisConnection from "../config/redis.config.js";
import prisma from "../db/prisma.js";
import sendGmail from "../utils/sendBookingConfirmationMail.js";

const bookingConfirmationMailWorker = new Worker(
    "bookingConfirmationMailQueue",
    async (job) => {
        const { to, bookingId } = job.data;

        const booking = await prisma.booking.findFirst({
            where: { id: bookingId },
            include: {
                schedule: {
                    select: {
                        arrivalTime: true,
                        departureTime: true,
                        date: true,
                        sourcePlatform: {
                            select: {
                                platformNumber: true,
                            },
                        },
                        destinationPlatform: {
                            select: {
                                platformNumber: true,
                                station: {
                                    select: {
                                        stationName: true,
                                    },
                                },
                            },
                        },
                    },
                },
                seatLock: {
                    select: {
                        seat: {
                            select: {
                                seatNumber: true,
                                seatName: true,
                                
                            },
                        },
                    },
                },
                passengerInfo: {
                    select: {
                        passengerName: true,
                        passengerAge: true,
                        passengerGender: true,
                        passengerStatus: true,
                    },
                },
            },
        });

        const tableRows = booking.passengerInfo
            .map((passenger, index) => {
                const seatLock = booking.seatLock[index];
                const seat = seatLock?.seat;

                return `
        <tr>
            <td>${passenger.passengerName}</td>
            <td>${passenger.passengerAge}</td>
            <td>${passenger.passengerGender}</td>
            <td>${passenger.passengerStatus}</td>
            <td>${seat?.coach?.coachName ?? "N/A"}</td>
            <td>${passenger.passengerStatus === "WAITLISTED" ? `WL-${index + 1}` : (seat?.seatName ?? "N/A")}</td>
        </tr>
    `;
            })
            .join("");

        const html = `
            <body>
                <div>
                    <h1>Booking ${booking.status === "CONFIRMED" ? "✅ Confirmed" : booking.status}</h1>
                    <p>PNR Number: <b>${booking.pnr}</b></p>
                    <p>Date: <b>${new Date(booking.schedule.date).toDateString()}</b></p>
                    <p>Source Platform: <b>${booking.schedule.sourcePlatform.platformNumber}</b></p>
                    <p>Destination Platform: <b>${booking.schedule.destinationPlatform.platformNumber}</b></p>
                    <p>Departure: <b>${new Date(booking.schedule.departureTime).toLocaleTimeString()}</b></p>
                    <p>Arrival: <b>${new Date(booking.schedule.arrivalTime).toLocaleTimeString()}</b></p>

                    <table>
                        <tr>
                            <th>Passenger Name</th>
                            <th>Age</th>
                            <th>Gender</th>
                            <th>Status</th>
                            <th>Coach</th>
                            <th>Seat / Berth / WL No</th>
                        </tr>
                        ${tableRows}
                    </table>

                    <div>
                        <p>${new Date().getFullYear()} IRCTC By Shahnawaz — Happy Journey </p>
                    </div>
                </div>
            </body>
            `;
        await sendGmail(to, "Booking Confirmation Mail", html);
    },
    {
        connection: redisConnection,
    }
);
bookingConfirmationMailWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

bookingConfirmationMailWorker.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
});

bookingConfirmationMailWorker.on("error", (err) => {
    console.error("Worker error:", err);
});

export default bookingConfirmationMailWorker;
