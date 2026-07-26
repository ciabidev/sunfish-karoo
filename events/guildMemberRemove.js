const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
    if (!channel) return;
    await channel.send(`⬅️ Until next time, ${member} \n-# we now have ${member.guild.memberCount} members`);
  },
};
