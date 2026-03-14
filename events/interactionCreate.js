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
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
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
            content: `An error occurred while executing this command, please report this to us via our [issue board](https://github.com/ciabidev/sunfish-karoo/issues)\n\`\`\`${content}\`\`\``,
            flags: [MessageFlags.Ephemeral],
          };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyContent);
        } else {
          await interaction.reply(replyContent);
        }
      }
    }

    // handle buttons
    if (interaction.isButton()) {
      const [action, extra] = interaction.customId.split(":");
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID)) {
        if (action === "approve_log") {
          let data = await interaction.client.modules.supabase.updateFestivalScore(interaction.user.id, extra, "add");
          if (data === "Already approved/denied") {
            await interaction.reply({
              content: `This festival log has already been approved/denied.`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await interaction.reply({
            content: `Approved festival log for <@${interaction.user.id}> and added 1 point.`,
            flags: MessageFlags.Ephemeral,
          });
        } else if (action === "remove_log") {
          let data = await interaction.client.modules.supabase.updateFestivalScore(interaction.user.id, extra, "remove");
          
          if (data === "Already approved/denied") {
            await interaction.reply({
              content: `This festival log has already been approved/denied.`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await interaction.reply({
            content: `Removed festival log for <@${interaction.user.id}> and subtracted 1 point.`,
            flags: MessageFlags.Ephemeral,
          });
        }
        // get and edit the festival log message to include APPROVED/DENIED
        const message = await interaction.client.channels.cache.get(process.env.FESTIVAL_LOG_CHANNEL_ID).messages.fetch(extra);
        if (!message) {
          await interaction.reply({
            content: `Failed to find festival log message with ID ${extra}.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await message.edit({
          components: [
            message.components[0],
            message.components[1],
            new ContainerBuilder().addTextDisplayComponents(
              (t) => t.setContent(`${action === "add" ? "### ✅ Approved" : "### ❌ Denied"} by <@${interaction.user.id}>\n`),
            ),
          ]
        
        });
        
      } else {
        await interaction.reply({
          content: "You do not have permission to approve festival logs.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
