import {
    Seat_Count_Sleeper_OR_3AC,
    AC_2_Coach_Seat_Count,
    AC_1_Coach_Seat_Count,
} from "../constants.js";
import { ApiError } from "./apiError.js";

const generateSeats = async (coachNumber, coachName, coachId, txn) => {
    if (!coachName || !coachNumber) {
        throw new ApiError(400, "Pass Both fields (coachNumber and coachName");
    }

    const seatType_3AC = [
        "LOWER",
        "MIDDLE",
        "UPPER",
        "LOWER",
        "MIDDLE",
        "UPPER",
        "SIDELOWER",
        "SIDEUPPPER",
    ];

    const seatType_2AC = [
        "LOWER",
        "UPPER",
        "LOWER",
        "UPPER",
        "SIDELOWER",
        "SIDEUPPPER",
    ];

    const seatType_1AC = [
        "LOWER",
        "UPPER",
        "LOWER",
        "UPPER",
        "SIDELOWER",
        "SIDEUPPPER",
    ];

    const SEAT_FILLING_Sleeper_OR_3AC_ = Array.from(
        { length: Seat_Count_Sleeper_OR_3AC },
        (_, index) => {
            const position = index % 8;
            return {
                seatNumber: index + 1,
                seatName: seatType_3AC[position],
                coachId,
            };
        }
    );

    const SEAT_FILLING_2AC = Array.from(
        { length: AC_2_Coach_Seat_Count },
        (_, index) => {
            const position = index % 6;
            return {
                seatNumber: index + 1,
                seatName: seatType_2AC[position],
                coachId,
            };
        }
    );

    const SEAT_FILLING_1AC = Array.from(
        { length: AC_1_Coach_Seat_Count },
        (_, index) => {
            const position = index % 4;
            return {
                seatNumber: index + 1,
                seatName: seatType_1AC[position],
                coachId,
            };
        }
    );

    coachName = coachName.toUpperCase().trim();

    const seats = async (seatData, txn) => {
        return await txn.seat.createMany({
            data: seatData,
        });
    };

    switch (coachName) {
        case "1AC" || "SLEEPER":
            return seats(SEAT_FILLING_Sleeper_OR_3AC_, txn);

        case "2AC":
            return seats(SEAT_FILLING_2AC, txn);

        case "1AC":
            return seats(SEAT_FILLING_2AC, txn);
        default:
            break;
    }
};


export { generateSeats };
