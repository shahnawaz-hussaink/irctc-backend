const getTenMinTime = () => {
    const TenMinFromNow = new Date(Date.now() + 10 * 60 * 1000);
    return TenMinFromNow ;
};

export default getTenMinTime;
