import jwt from "jsonwebtoken";

const generateAccessToken = (userID, email, role) => {
    return jwt.sign({ id : userID, email, role }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
};

const generateRefreshToken = (userID) => {
    return jwt.sign({ id :userID }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
};

export { generateAccessToken, generateRefreshToken };
 