import jwt from "jsonwebtoken";

const generateAccessToken = (userID) => {
    return jwt.sign({ userID: userID }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
};

const generateRefreshToken = (userID) => {
    return jwt.sign({ userID: userID }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
};

export { generateAccessToken ,generateRefreshToken};
