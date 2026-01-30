const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const CHANNEL_ID = "1393752798625140757";
    const channel = member.guild.channels.cache.get(CHANNEL_ID);
    if (!channel) return;
    await channel.send(`➡️ Welcome ${member} to Sunfish Village! \n-# we now have ${member.guild.memberCount} members`);
  },
};