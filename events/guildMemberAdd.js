const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);

    if (!channel) return;
    await channel.send(
      `<@&1481829069422067712> ➡️ Welcome ${member} to Sunfish Village! <#1393748197117005958> 
- **Looking for quick help/services?** Ping in <#1463002217886908496>. We have tons of active helpers ready for the job
-# In our Lantern Festival this winter, you can get **free items for hosting parties** https://discord.com/channels/1393397825085374587/1542609776066699354/1542613981502373929`,
    );
  },
};
