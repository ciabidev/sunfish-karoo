const { ChannelType, Events, MessageFlags } = require("discord.js");
const { getSailorsLodgeHostId } = require("../commands/context/logParty.js");
const { partyChannelsComponents } = require("../commands/festival/partychannels.js");
const { festivalShopComponents } = require("../commands/festival/shop.js");

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
      if (interaction.customId.startsWith("festival_shop:")) {
        const [, action, itemId, pageValue] = interaction.customId.split(":");

        if (action === "page") {
          const items = await interaction.client.modules.database.getFestivalShopItems();
          const user = await interaction.client.modules.database.getFestivalUser(interaction.user.id);
          await interaction.update({
            components: festivalShopComponents(
              items,
              interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID),
              user?.score ?? 0,
              Number(itemId) || 0
            ),
          });
          return;
        }

        if (action === "buy") {
          const purchase = await interaction.client.modules.database.purchaseFestivalShopItem(
            interaction.user.id,
            itemId
          );

          if (purchase.status === "insufficient_points") {
            await interaction.reply({
              content: "You do not have enough festival points to buy this item.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const items = await interaction.client.modules.database.getFestivalShopItems();
          const user = await interaction.client.modules.database.getFestivalUser(interaction.user.id);
          await interaction.update({
            components: festivalShopComponents(
              items,
              interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID),
              user?.score ?? 0,
              Number(pageValue) || 0
            ),
          });

          if (purchase.status === "unavailable") {
            await interaction.followUp({
              content: "That item is no longer available.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          await interaction.followUp({
            content: `You bought **${purchase.itemName}** for ${purchase.pointsPaid} ${purchase.pointsPaid === 1 ? "point" : "points"}. You have ${purchase.remainingPoints} remaining.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (!interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID)) {
          await interaction.reply({
            content: "You need the festival manager role to change festival shop items.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (action === "add") {
          await interaction.showModal(interaction.client.modules.festivalShopItemModal());
          return;
        }

        if (action === "edit") {
          const item = await interaction.client.modules.database.getFestivalShopItem(itemId);
          if (!item) {
            await interaction.reply({
              content: "That festival shop item no longer exists. Run the command again to refresh the shop.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await interaction.showModal(interaction.client.modules.festivalShopItemModal(item));
          return;
        }

        if (action === "remove") {
          await interaction.client.modules.database.removeFestivalShopItem(itemId);
          const items = await interaction.client.modules.database.getFestivalShopItems();
          const user = await interaction.client.modules.database.getFestivalUser(interaction.user.id);
          await interaction.update({
            components: festivalShopComponents(
              items,
              true,
              user?.score ?? 0,
              Number(pageValue) || 0
            ),
          });
          return;
        }

        return;
      }

      if (interaction.customId.startsWith("festival_party_channels:")) {
        const [, action, channelId, pageValue] = interaction.customId.split(":");

        if (action === "page") {
          const channels = await interaction.client.modules.database.getFestivalPartyChannels();
          await interaction.update({
            components: partyChannelsComponents(
              channels,
              interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID),
              Number(channelId) || 0
            ),
          });
          return;
        }

        if (!interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID)) {
          await interaction.reply({
            content: "You need the festival manager role to change party channels.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (action === "add") {
          await interaction.showModal(interaction.client.modules.partyChannelModal());
          return;
        }

        if (action === "edit") {
          const channel = await interaction.client.modules.database.getFestivalPartyChannel(channelId);
          if (!channel) {
            await interaction.reply({
              content: "That party channel is no longer configured. Run the command again to refresh the list.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await interaction.showModal(interaction.client.modules.partyChannelModal(channel));
          return;
        }

        if (action === "remove") {
          await interaction.client.modules.database.removeFestivalPartyChannel(channelId);
          const channels = await interaction.client.modules.database.getFestivalPartyChannels();
          await interaction.update({
            components: partyChannelsComponents(channels, true, Number(pageValue) || 0),
          });
          return;
        }

        return;
      }

      const [action, extra] = interaction.customId.split(":");
      if (action !== "approve_log" && action !== "remove_log") return;
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
      if (interaction.customId.startsWith("festival_shop:save:")) {
        if (!interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID)) {
          await interaction.reply({
            content: "You need the festival manager role to change festival shop items.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const [, , itemId] = interaction.customId.split(":");
        const name = interaction.fields.getTextInputValue("name").trim();
        const description = interaction.fields.getTextInputValue("description").trim();
        const price = Number(interaction.fields.getTextInputValue("price").trim());
        const stock = Number(interaction.fields.getTextInputValue("stock").trim());
        const image = interaction.fields.getUploadedFiles("image")?.first() ?? null;
        const existingItem = itemId === "new"
          ? null
          : await interaction.client.modules.database.getFestivalShopItem(itemId);

        if (itemId !== "new" && !existingItem) {
          await interaction.reply({
            content: "That festival shop item no longer exists. Run the command again to refresh the shop.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (!name || !description) {
          await interaction.reply({
            content: "The item name and description cannot be empty.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        if (!Number.isSafeInteger(price) || price < 1 || price > 999999) {
          await interaction.reply({
            content: "The point value must be a whole number from 1 to 999999.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        if (!Number.isSafeInteger(stock) || stock < 0 || stock > 999999) {
          await interaction.reply({
            content: "Stock must be a whole number from 0 to 999999.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        if (!image && !existingItem) {
          await interaction.reply({
            content: "A shop item image is required.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        if (image && !image.contentType?.startsWith("image/")) {
          await interaction.reply({
            content: "The shop item attachment must be an image.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.client.modules.database.setFestivalShopItem(
          itemId,
          name,
          description,
          price,
          stock,
          image ? image.url : existingItem.imageUrl
        );
        const items = await interaction.client.modules.database.getFestivalShopItems();
        const user = await interaction.client.modules.database.getFestivalUser(interaction.user.id);
        await interaction.reply({
          components: festivalShopComponents(items, true, user?.score ?? 0),
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.customId.startsWith("festival_party_channels:save:")) {
        if (!interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID)) {
          await interaction.reply({
            content: "You need the festival manager role to change party channels.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const [, , previousChannelId] = interaction.customId.split(":");
        const channelId = interaction.fields
          .getSelectedChannels(
            "channel",
            true,
            [ChannelType.GuildText, ChannelType.GuildAnnouncement]
          )
          .first().id;
        const points = Number(interaction.fields.getTextInputValue("points").trim());

        if (!Number.isSafeInteger(points) || points < 1 || points > 999999) {
          await interaction.reply({
            content: "Points per log must be a whole number from 1 to 999999.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.client.modules.database.setFestivalPartyChannel(
          channelId,
          points,
          previousChannelId === "new" ? channelId : previousChannelId
        );
        const channels = await interaction.client.modules.database.getFestivalPartyChannels();
        await interaction.reply({
          components: partyChannelsComponents(channels, true),
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.customId.startsWith("party_log_modal:")) {
        const activity = interaction.fields.getTextInputValue("activity");
        const screenshotFiles = interaction.fields.getUploadedFiles("screenshot");
        const [, channelId, messageId] = interaction.customId.split(":");

        try {
          const channel = await interaction.client.channels.fetch(channelId);
          const targetMessage = await channel.messages.fetch(messageId);
          const hostId = getSailorsLodgeHostId(targetMessage);

          if (!hostId) {
            return await interaction.reply({
              content: "This isn't a valid Sailor's Lodge party ping.",
              flags: MessageFlags.Ephemeral,
            });
          }
          if (hostId !== interaction.user.id) {
            return await interaction.reply({
              content: "You can only log your own party.",
              flags: MessageFlags.Ephemeral,
            });
          }
          if (await interaction.client.modules.database.isPartyMessageLogged(targetMessage.id)) {
            return await interaction.reply({
              content: "This party has already been logged.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const partyChannel = await interaction.client.modules.database.getFestivalPartyChannel(
            targetMessage.channelId
          );
          if (!partyChannel) {
            return await interaction.reply({
              content: "This channel is no longer configured as a festival party channel.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const durationMinutes = (Date.now() - new Date(targetMessage.createdAt)) / 1000 / 60;
          const isSuspicious = durationMinutes < 10;

         
          const hasScreenshot = screenshotFiles && screenshotFiles.size > 0;
          

          const postData = {
            content: `Hosted ${activity} for ${durationMinutes.toFixed(1)} minutes - ${targetMessage.url}`,
            components: [],
            allowedMentions: {
              parse: [],
              users: [interaction.user.id],
              roles: [],
            },
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

            // Create the forum post through a temporary webhook so it displays as the host.
            const statusTagId = isSuspicious
              ? process.env.FESTIVAL_PENDING_TAG_ID
              : process.env.FESTIVAL_APPROVED_TAG_ID;
            const hostMember = await interaction.guild.members.fetch(interaction.user.id);
            const webhook = await logChannel.createWebhook({
              name: "Karoo Party Log",
              reason: `Creating a festival log for ${interaction.user.id}`,
            });
            let webhookMessage;

            try {
              webhookMessage = await webhook.send({
                ...postData,
                files,
                username: hostMember.displayName,
                avatarURL: hostMember.displayAvatarURL({ size: 256 }),
                threadName: activity.length > 100 ? `${activity.slice(0, 97)}...` : activity,
                appliedTags: statusTagId ? [statusTagId] : [],
              });
            } finally {
              await webhook.delete("Festival log created").catch((error) => {
                console.error("[PARTY LOG] Failed to delete temporary webhook:", error);
              });
            }

            const threadId = webhookMessage.channelId;

            if (isSuspicious) {
              const thread = await interaction.client.channels.fetch(threadId);
              if (thread) {
                await thread.send({
                  content: `<@&${process.env.FESTIVAL_MANAGER_ROLE_ID}> this seems suspicious... please review.\n-# Reason: Suspiciously short duration`,
                  allowedMentions: { roles: [process.env.FESTIVAL_MANAGER_ROLE_ID] },
                });
              }
            }

            // Award festival point to host (only if not flagged for review)
            if (!isSuspicious) {
              try {
                await interaction.client.modules.database.updateFestivalScore(
                  interaction.user.id,
                  threadId,
                  "add",
                  partyChannel.points
                );
              } catch (error) {
                console.error("[PARTY LOG] Failed to award festival point:", error);
              }
            }

            // Mark message as logged
            try {
              await interaction.client.modules.database.addPartyLog(
                interaction.user.id,
                threadId,
                targetMessage.id,
                isSuspicious ? "pending" : "approved",
                partyChannel.points
              );
            } catch (error) {
              console.error("[PARTY LOG] Failed to mark party as logged:", error);
            }

            const successMessage = isSuspicious
              ? `Party logged successfully! Flagged for review — ${partyChannel.points} ${partyChannel.points === 1 ? "point" : "points"} will be awarded upon approval.`
              : `Party logged successfully! ${partyChannel.points} ${partyChannel.points === 1 ? "point" : "points"} awarded.`;
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
