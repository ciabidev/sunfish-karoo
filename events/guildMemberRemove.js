const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const CHANNEL_ID = "1393752798625140757";
    const channel = member.guild.channels.cache.get(CHANNEL_ID);
    if (!channel) return;
    await channel.send(`⬅️ Until next time, ${member} \n-# we now have ${member.guild.memberCount} members`);
  },
};