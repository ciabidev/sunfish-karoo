const { Events } = require("discord.js");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    
    const channel = message.channel;
    const WHIRLPOOL_CHANNEL_ID = "1435802233655656549"; // replace with your actual channel ID
    if (channel.id === WHIRLPOOL_CHANNEL_ID) {
        await message.delete();

        try {
            await message.guild.members.ban(message.author.id, {
                reason: "Spam bot detected",
                days: 1000000000,
            });
        } catch (err) {
            console.error(`${message.author.username} survived the whirlpool and was not banned: `, err);
        }
    }

    // check if ?luckping or luckping is sent in the luck channel

    const LUCK_CHANNEL_ID = "1393401001029140610"; // replace with your actual channel ID
    const LUCK_PING_ROLE_ID = "1393774571336896592"; // replace with your actual role ID
    if (channel.id === LUCK_CHANNEL_ID) {
        const messageContent = message.content.toLowerCase();
        // make sure the message is from a followed server
        const isFromFollowedServer = message.webhookId !== null;
        if (!isFromFollowedServer) return;
        if (messageContent.includes("?luckparty") || messageContent.includes("luckping")) {
            await channel.send(`luck party from followed server: <@${message.author.id}> (<@&${LUCK_PING_ROLE_ID}>)`);
        }
    }
  },
}
