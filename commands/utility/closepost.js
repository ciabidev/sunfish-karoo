const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("closepost").setDescription("Close the current post"),
  async execute(interaction) {
    try {
      let thread = interaction.channel;

      if (!thread.isThread()) {
        return await interaction.reply({
          content: "This command can only be used in a post",
          ephemeral: true,
        });
      }

      if (interaction.user.id !== thread.ownerId) {
        return await interaction.reply({
          content: "You are not the creator of this post",
          ephemeral: true,
        });
      }
      await interaction.reply({ content: `Post closed`, ephemeral: true });

      await thread.setArchived(true);
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: "Failed to fetch or reopen that post. Make sure I have access to it.",
        ephemeral: true,
      });
    }
  },
};
