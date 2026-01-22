const { Events, MessageFlags } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const client = interaction.client;

    // ✅ Handle autocomplete first
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error("Autocomplete error:", error);
      }
      return;
    }

    // ✅ Handle normal slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      let content = error.message;
      if (error.stack) {
        content += `\n\n${error.stack}`;
      }
      
      if (error.code === 50001) {
        content = "I don't have access to this channel, or I can't send messages to this user.";
      }
      const replyContent = {
        content:
          "### Internal Error \nTo report this error: https://github.com/ciabidev/sunfish-karoo/issues \n```" +
          content +
          "```",
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyContent);
      } else {
        await interaction.reply(replyContent);
      }
    }
  },
};
