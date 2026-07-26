const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);

    if (!channel) return;
    await channel.send(
      `<@&${process.env.WELCOME_ROLE_ID}> ➡️ Welcome ${member} to Sunfish Village! Please verify in <#${process.env.VERIFY_CHANNEL_ID}> to gain access to the rest of the server.
- Need story help or a taxi? Ping in
- Want to ping specific roles? Apply for Trusted Host in <#${process.env.TRUSTED_HOST_CHANNEL_ID}>`,
    );
  },
};
