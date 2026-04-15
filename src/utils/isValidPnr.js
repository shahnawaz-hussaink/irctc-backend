const isValidPnr = (pnr) => {
    return /^\d{10}$/.test(pnr);
};

export default isValidPnr;
