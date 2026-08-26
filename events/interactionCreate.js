const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  Events,
  MessageFlags,
  SeparatorSpacingSize,
} = require("discord.js");
const { getSailorsLodgeHostId } = require("../commands/context/logParty.js");
const { partyChannelsComponents } = require("../commands/festival/partychannels.js");
const { festivalShopComponents } = require("../commands/festival/shop.js");
const { festivalInventoryComponents } = require("../commands/festival/inventory.js");

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
      if (interaction.customId.startsWith("festival_inventory:")) {
        const [, action, value] = interaction.customId.split(":");

        if (action === "page") {
          const items = await interaction.client.modules.database.getFestivalInventory(
            interaction.user.id
          );
          await interaction.update({
            components: festivalInventoryComponents(items, Number(value) || 0),
          });
          return;
        }

        if (action === "checkout") {
          const checkoutChannel = await interaction.client.channels
            .fetch(process.env.FESTIVAL_CHECKOUT_CHANNEL_ID)
            .catch(() => null);
          if (!checkoutChannel || checkoutChannel.type !== ChannelType.GuildText) {
            await interaction.reply({
              content: "The festival checkout channel is not configured as a text channel.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          await interaction.deferUpdate();
          const checkout = await interaction.client.modules.database.createFestivalCheckoutRequest(
            interaction.user.id
          );
          if (checkout.status === "pending") {
            await interaction.followUp({
              content: "You already have a pending festival collection request.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          if (checkout.status === "empty") {
            const items = await interaction.client.modules.database.getFestivalInventory(
              interaction.user.id
            );
            await interaction.editReply({ components: festivalInventoryComponents(items) });
            await interaction.followUp({
              content: "You do not have any festival items ready for collection.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          let requestMessage;
          let thread;
          try {
            const quantities = new Map();
            for (const purchase of checkout.purchases) {
              quantities.set(
                purchase.itemName,
                (quantities.get(purchase.itemName) ?? 0) + (purchase.quantity ?? 1)
              );
            }
            const itemLines = [...quantities].map(
              ([name, quantity]) => `-# > **${quantity}×** ${name}`
            );

            const requestContainer = new ContainerBuilder()
              .setAccentColor(0xf5a623)
              .addTextDisplayComponents((text) =>
                text.setContent(
                  `## <@${interaction.user.id}> is ready to collect their festival rewards\nWhen ready, a <@&${process.env.FESTIVAL_MANAGER_ROLE_ID}> will join you in-game and send you the items.`,
                ),
              )
              .addSeparatorComponents((separator) =>
                separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
              );
            let requestItems = "";
            for (const line of itemLines) {
              if (`${requestItems}\n${line}`.length > 3500) {
                requestContainer.addTextDisplayComponents((text) => text.setContent(requestItems));
                requestItems = "";
              }
              requestItems += `${requestItems ? "\n" : ""}${line}`;
            }
            requestContainer
              .addTextDisplayComponents((text) => text.setContent(`**Items:**\n${requestItems}`))
              .addSeparatorComponents((separator)  =>
                separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
              )
              .addActionRowComponents((row) =>
                row.addComponents(
                  new ButtonBuilder()
                    .setCustomId(`festival_inventory:complete:${checkout.request._id}`)
                    .setLabel("Mark Complete")
                    .setStyle(ButtonStyle.Success)
                )
              );
            requestMessage = await checkoutChannel.send({
              components: [requestContainer],
              flags: MessageFlags.IsComponentsV2,
              allowedMentions: {
                parse: [],
                users: [interaction.user.id],
                roles: [process.env.FESTIVAL_MANAGER_ROLE_ID],
              },
            });
            thread = await requestMessage.startThread({
              name: `Collection - ${interaction.user.username}`.slice(0, 100),
              autoArchiveDuration: 1440,
              reason: `Festival collection request for ${interaction.user.id}`,
            });

            let threadContent = `<@${interaction.user.id}> use this thread to coordinate with the festival managers.`
            await thread.send({
              content: threadContent,
              allowedMentions: { parse: [], users: [interaction.user.id] },
            });
            await interaction.client.modules.database.setFestivalCheckoutRequestMessage(
              checkout.request._id,
              requestMessage.id,
              thread.id
            );
          } catch (error) {
            if (thread) await thread.delete("Failed to create festival checkout").catch(() => null);
            if (requestMessage) {
              await requestMessage.delete().catch(() => null);
            }
            await interaction.client.modules.database.cancelFestivalCheckoutRequest(
              checkout.request._id
            );
            console.error("Failed to create festival checkout request:", error);
            await interaction.followUp({
              content: "Failed to create your festival collection request. Please try again.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const items = await interaction.client.modules.database.getFestivalInventory(
            interaction.user.id
          );
          await interaction.editReply({ components: festivalInventoryComponents(items) });
          await interaction.followUp({
            content: `Your collection request was sent. Continue in <#${thread.id}>.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (action === "complete") {
          if (!interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID)) {
            await interaction.reply({
              content: "You need the festival manager role to complete collection requests.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const checkout = await interaction.client.modules.database.completeFestivalCheckoutRequest(
            value
          );
          if (checkout.status === "missing") {
            await interaction.reply({
              content: "That festival collection request no longer exists.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const components = interaction.message.components.map((component) => component.toJSON());
          const actionRow = components[0].type === 17
            ? components[0].components.findLast((component) => component.type === 1)
            : components.find((component) => component.type === 1);
          actionRow.components[0].label = "Collected!";
          actionRow.components[0].disabled = true;
          await interaction.update({ components });
          if (checkout.threadId) {
            const thread = await interaction.client.channels.fetch(checkout.threadId).catch(() => null);
            if (thread) {
              await thread.edit({ archived: true, locked: true }, "Festival collection completed");
            }
          }
          return;
        }

        return;
      }

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
            content: `You bought **${purchase.itemName}** for ${purchase.pointsPaid} ${purchase.pointsPaid === 1 ? "point" : "points"}. Use \`/festival inventory\` when you are ready to collect your items.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (action === "buy_many") {
          const item = await interaction.client.modules.database.getFestivalShopItem(itemId);
          if (!item || item.stock === 0) {
            await interaction.reply({
              content: "That item is no longer available.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await interaction.showModal(interaction.client.modules.festivalShopBuyModal(item));
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
      if (interaction.customId.startsWith("festival_shop:buy_many:")) {
        const [, , itemId] = interaction.customId.split(":");
        const quantity = Number(interaction.fields.getTextInputValue("quantity").trim());
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999999) {
          await interaction.reply({
            content: "Quantity must be a whole number from 1 to 999999.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.deferReply({
          flags: MessageFlags.Ephemeral,
        });

        let purchase;
        try {
          purchase = await interaction.client.modules.database.purchaseFestivalShopItem(
            interaction.user.id,
            itemId,
            quantity
          );
        } catch (error) {
          console.error("Failed to purchase multiple festival shop items:", error);
          await interaction.editReply({
            content: "Failed to complete that purchase. Please try again.",
          });
          return;
        }
        if (purchase.status === "insufficient_points") {
          await interaction.editReply({
            content: "You do not have enough festival points to buy that many.",
          });
          return;
        }
        if (purchase.status !== "purchased") {
          await interaction.editReply({
            content: "That quantity is no longer available.",
          });
          return;
        }

        await interaction.editReply({
          content: `You bought **${purchase.quantity}× ${purchase.itemName}** for ${purchase.pointsPaid} ${purchase.pointsPaid === 1 ? "point" : "points"}. Use \`/festival inventory\` when you are ready to collect your items.`,
        });
        return;
      }

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
