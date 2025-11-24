const { PermissionsBitField, MessageFlags, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("clear messages from a channel")
    .addIntegerOption((option) =>
      option.setName("amount").setDescription("the amount of messages to delete").setRequired(true)
    )
    .addChannelOption((option) =>
      option.setName("channel").setDescription("the channel to delete messages from. current channel by default.").setRequired(false)
    ),
  execute: async (interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      await interaction.reply({
        content:
          "You do not have permission to purge messages (need Manage Messages permission, try contacting an admin if you're a moderator).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const amount = interaction.options.getInteger("amount");
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    await channel.bulkDelete(amount).catch(() => {}); // optional safety
    await interaction.deferReply();
    await interaction.editReply({
      content: `Purged ${amount} messages from ${channel.name}`,
    });
  },
};