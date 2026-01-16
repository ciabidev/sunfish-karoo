const { Events, MessageFlags } = require("discord.js");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const isFromFollowedServer = message.flags.has(MessageFlags.IsCrosspost);
    console.log("isFromFollowedServer: ", isFromFollowedServer);
    const channel = message.channel;
    const WHIRLPOOL_CHANNEL_ID = "1435802233655656549"; // replace with your actual channel ID
    const FOLLOWED_LUCK_CHANNEL_ID = "1393401001029140610"; // replace with your actual channel ID
    const NORMAL_LUCK_CHANNEL_ID = "1443682008059613216"; // replace with your actual channel ID
    const LUCK_PING_ROLE_ID = "1393774571336896592"; // replace with your actual role ID
    const LUCK_HOST_ROLE_ID = "1431089001728835644"; // replace with your actual role ID
    const FOLLOWED_EPICENTER_CHANNEL_ID = "1436513161283895416"; // replace with your actual channel ID
    const EPICENTER_PING_ROLE_ID = "1436523924472070187"; // replace with your actual role ID
    if (channel.id === WHIRLPOOL_CHANNEL_ID) {
      await message.delete();

      try {
        await message.guild.members.ban(message.author.id, {
          reason: "Spam bot detected",
          days: 1000000000,
        });
      } catch (err) {
        console.error(
          `${message.author.username} survived the whirlpool and was not banned: `,
          err
        );
      }
    }
    /* -------------------
    Normal Luck Channel
    -------------------- */

    // check if ?luckping or luckping is sent in the normal luck  channel

    /* -------------------
    Followed Luck Channel
    -------------------- */
    if (channel.id === NORMAL_LUCK_CHANNEL_ID) {
      if (message.content.toLowerCase().includes("?luckping")) {
        // check if the user has the luck host role
        if (
          !message.member.roles.cache.has(LUCK_HOST_ROLE_ID)
        ) return
        await channel.send(
          `<@${message.author.id}> is hosting a luck party! <@&${LUCK_PING_ROLE_ID}>`
        );
      }
    }

    // check if ?luckping or luckping is sent in the followed luck channel
    const serverPartnerText = `\n-# this host is part of our <#1393424277180776619>`;
    if (isFromFollowedServer) {
      console.log("Received message from followed server: ", message.content);

      if (channel.id === FOLLOWED_LUCK_CHANNEL_ID) {
        const messageContent = message.content.toLowerCase();
        // make sure the message is from a followed server
        if (
          messageContent.includes("?luckparty") ||
          messageContent.includes("luckping") ||
          messageContent.includes("@luck")
        ) {
          console.log("Luck ping message received: ", messageContent);
          await channel.send(
            `Luck party ping from followed server by <@${message.author.id}>! <@&${LUCK_PING_ROLE_ID}>${serverPartnerText}`
          );
        }
      }

      if (channel.id === FOLLOWED_EPICENTER_CHANNEL_ID) {
        const messageContent = message.content.toLowerCase();
        if (messageContent.includes("epiping")) {
          console.log("Epicenter ping message received: ", messageContent);
          await channel.send(
            `Epicenter party ping from followed server by <@${message.author.id}>! <@&${EPICENTER_PING_ROLE_ID}>${serverPartnerText}`
          );
        }
      }
    }
  },
};
