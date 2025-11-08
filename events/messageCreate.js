const { Events, MessageFlags } = require("discord.js");

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
  },
}
