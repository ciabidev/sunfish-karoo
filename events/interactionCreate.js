const { Events, MessageFlags, ModalBuilder, TextInputBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require("discord.js");

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

    // ✅ Handle context menu commands
    if (interaction.isMessageContextMenuCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No context command matching ${interaction.commandName} was found.`);
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
          let data = await interaction.client.modules.database.updateFestivalScore(interaction.user.id, extra, "add");
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
          let data = await interaction.client.modules.database.updateFestivalScore(interaction.user.id, extra, "remove");
          
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
        
        const festivalChannel = await interaction.client.channels.fetch(process.env.FESTIVAL_CHANNEL_ID);
        const message = await festivalChannel.messages.fetch(extra).catch(() => null);
        if (!message) {
          await interaction.reply({
            content: `Failed to find festival log message with ID ${extra}.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await message.edit({
          content: `${action === "approve_log" ? "✅ Approved" : "❌ Denied"} by <@${interaction.user.id}>`,
          components: [],
        });
        
      } else {
        await interaction.reply({
          content: "You do not have permission to approve festival logs.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // handle party log modal submission
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("party_log_modal:")) {
        const activity = interaction.fields.getTextInputValue("activity");
        const screenshotFiles = interaction.fields.getUploadedFiles("screenshot");
        const [, channelId, messageId] = interaction.customId.split(":");

        const hostMention = `<@${interaction.user.id}>`;

        try {
          const channel = await interaction.client.channels.fetch(channelId);
          const targetMessage = await channel.messages.fetch(messageId);
          const durationMinutes = (Date.now() - new Date(targetMessage.createdAt)) / 1000 / 60;
          const isSuspicious = durationMinutes < 10;

         
          const hasScreenshot = screenshotFiles && screenshotFiles.size > 0;
          

          const postData = {
            content: `**${activity}** hosted by <@${interaction.user.id}> for ${durationMinutes.toFixed(1)} minutes${isSuspicious ? `\n<@&${process.env.FESTIVAL_MANAGER_ROLE_ID}> this seems suspicious... please review.\n-# Reason: Suspiciously short duration` : ``}`,
            components: [],
          };

          // Prepare files for upload
          const files = [];
          if (hasScreenshot) {
            for (const file of screenshotFiles.values()) {
              files.push({ attachment: file.url, name: file.name });
            }
          }

          try {
            const logChannel = await interaction.client.channels.fetch(process.env.FESTIVAL_CHANNEL_ID);
            if (!logChannel) {
              console.error("[PARTY LOG] FESTIVAL_CHANNEL_ID not configured");
              await interaction.reply({
                content: "Failed to post log. Please check bot configuration.",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }

            // Create forum post
            const thread = await logChannel.threads.create({
              name: activity.length > 100 ? `${activity.slice(0, 97)}...` : activity,
              message: { ...postData, files },
            });

            // Award festival point to host (only if not flagged for review)
            if (!isSuspicious) {
              try {
                await interaction.client.modules.database.updateFestivalScore(interaction.user.id, thread.id, "add");
              } catch (error) {
                console.error("[PARTY LOG] Failed to award festival point:", error);
              }
            }

            // Mark message as logged
            try {
              await interaction.client.modules.database.addPartyLog(
                interaction.user.id,
                thread.id,
                targetMessage.id,
                isSuspicious ? "pending" : "approved"
              );
            } catch (error) {
              console.error("[PARTY LOG] Failed to mark party as logged:", error);
            }

            const successMessage = isSuspicious
              ? "Party logged successfully! Flagged for review — points will be awarded upon approval."
              : "Party logged successfully! Point awarded.";
            await interaction.reply({
              content: successMessage,
              flags: MessageFlags.Ephemeral,
            });
          } catch (error) {
            console.error("[PARTY LOG] Failed to post log:", error);
            await interaction.reply({
              content: "Failed to post log. Please try again or contact support.",
              flags: MessageFlags.Ephemeral,
            });
          }
        } catch (error) {
          console.error("[PARTY LOG] Failed to process modal:", error);
          await interaction.reply({
            content: "Failed to process your submission. Please try again or contact support.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }
  },
};
