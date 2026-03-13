const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const CHANNEL_ID = "1393752798625140757";
    const WELCOME_ROLE_ID = "1481829069422067712  ";
    const VERIFY_CHANNEL_ID = "1393752798625140757";
    const channel = member.guild.channels.cache.get(CHANNEL_ID);
    if (!channel) return;
    await channel.send(
      `➡️ <@&${WELCOME_ROLE_ID}> Welcome ${member} to Sunfish Village! Please verify in <#1393748197117005958> to see all channels. \n-# we now have ${member.guild.memberCount} members`,
    );
  },
};