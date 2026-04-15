import crypto from "crypto";

const generatePNR = () => {
    const pnr = crypto.randomInt(10 ** 9, 10 ** 10 - 1);
    return JSON.stringify(pnr);
};
export default generatePNR;
