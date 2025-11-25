const { PermissionsBitField, MessageFlags, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("clear messages from a channel")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("the amount of messages to delete (up to 1000)")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("the channel to delete messages from. current channel by default.")
        .setRequired(false)
    ),
  execute: async (interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      await interaction.reply({
        content:
          "You do not have permission to purge messages (need Manage Messages permission, contact an admin).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // check if the bot has the Manage Messages permission in the channel
    if (
      !interaction.channel
        .permissionsFor(interaction.guild.members.me)
        .has(PermissionsBitField.Flags.ManageMessages)
    ) {
      await interaction.reply({
        content:
          "I do not have permission to delete messages in this channel (need Manage Messages permission, contact an admin).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const amount = interaction.options.getInteger("amount");
    const channel = interaction.options.getChannel("channel") || interaction.channel;

    if (amount > 1000) {
      await interaction.reply({
        content: "You cannot delete more than 1000 messages at once.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let hasOlderMessages = false;
    let totalFetched = [];
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // repeat through all fetched until we reach 100 or the amount
    for (let i = 0; i <= Infinity; i += 100) {
      let fetched = await channel.messages.fetch({ limit: 100 });
      // filter fetch to exclude the deferReply message
      // find messages older than 2 weeks
      if (
        fetched !== undefined &&
        fetched.first() !== undefined &&
        fetched.first().createdAt.getTime() < Date.now() - 1000 * 60 * 60 * 24 * 14
      ) {
        hasOlderMessages = true;
      }
      // add fetched messages to totalFetched
      totalFetched.push(...fetched);
      await channel.bulkDelete(100);
      if (i > amount || i > totalFetched.size) break;
    }
    await interaction.editReply({
      content: `Purged ${amount} messages from ${channel.name}. ${
        hasOlderMessages ? "Some messages are older than 2 weeks and couldn't be deleted." : ""
      }`,
    });

    await interaction.followUp({
      content: `Purged ${amount} messages from ${channel.name}. ${
        hasOlderMessages ? "Some messages are older than 2 weeks and couldn't be deleted." : ""
      }`,
    });
  },
};
