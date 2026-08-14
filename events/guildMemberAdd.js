const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);

    if (!channel) return;
    await channel.send(
      `<@&${process.env.WELCOME_ROLE_ID}> ➡️ Welcome ${member} to Sunfish Village! <#${process.env.VERIFY_CHANNEL_ID}>
- Need help with the story, sailing, or crafting? Ping in <#${process.env.QUICK_HELP_CHANNEL_ID}> or post in <#${process.env.QUESTS_FORUM_ID}>. We have tons of active helpers ready for the job`,
    );
  },
};
