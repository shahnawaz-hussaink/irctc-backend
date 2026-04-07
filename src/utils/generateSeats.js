import { Seat_Count_Sleeper_OR_3AC } from "../constants.js";
import prisma from "../db/prisma.js";
import { ApiError } from "./apiError.js";

const generateSeats = async (coachNumber, coachName, coachId , tx) => {
    if (!coachName || !coachNumber) {
        throw new ApiError(400, "Pass Both fields (coachNumber and coachName");
    }

    const seatType = [
        "LOWER",
        "MIDDLE",
        "UPPER",
        "LOWER",
        "MIDDLE",
        "UPPER",
        "SIDELOWER",
        "SIDEUPPPER",
    ];

    const Sleeper_OR_3AC_SEAT_FILLING = Array.from(
        { length: Seat_Count_Sleeper_OR_3AC },
        (_, index) => {
            const position = index % 8;
            return {
                seatNumber: index + 1,
                seatName: seatType[position],
                coachId,
            };
        }
    );

    coachName = coachName.toUpperCase().trim();

    switch (coachName) {
        case "3AC" || "SLEEPER":
            const seats = await tx.seat.createMany({
                data: Sleeper_OR_3AC_SEAT_FILLING,
            });
            return seats;

        default:
            break;
    }
};


export { generateSeats };
