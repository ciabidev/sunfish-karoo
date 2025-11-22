module.exports = (snowflake) => {
    const snowflakeRegex = /^[0-9]{18}$/;
    return snowflakeRegex.test(snowflake);
};