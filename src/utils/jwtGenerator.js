import jwt from "jsonwebtoken";

const generateAccessToken = (userID, email, role) => {
    return jwt.sign({ userID, email, role }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
};

const generateRefreshToken = (userID) => {
    return jwt.sign({ userID }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
};

export { generateAccessToken, generateRefreshToken };
