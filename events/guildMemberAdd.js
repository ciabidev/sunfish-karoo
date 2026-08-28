const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);

    if (!channel) return;
    await channel.send(
      `<@&1481829069422067712> ➡️ Welcome ${member} to Sunfish Village! <#1393748197117005958> 
-# In our Lantern Festival this winter, you can get **free items for hosting parties** https://discord.com/channels/1393397825085374587/1542609776066699354/1542613981502373929`,
    );
  },
};
