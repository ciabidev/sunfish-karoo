const { PermissionsBitField, MessageFlags } = require("discord.js");

// get points variable from moderation.js
const { getUserPoints } = require("../../src/modules/supabase");
const { SlashCommandSubcommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("punish")
    .setDescription("warn, timeout, or ban a member based on their previous points")
    .addUserOption((option) =>
      option.setName("member").setDescription("the member to punish").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("the reason for the punishment").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("add")
        .setDescription("the amount of points to add to this member")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("delete_messages_on_ban")
        .setDescription("whether to delete messages from the user when banned")
        .addChoices(
          { name: "Yes", value: "true" },
          { name: "No", value: "false" }
        )
    ),
  execute: async (interaction) => {
    if (interaction.member.permissions.has(PermissionsBitField.Flags.TimeoutMembers)) {
      const targetUser = interaction.options.getUser("member");
      const targetMember = await interaction.guild.members.fetch(targetUser.id);

      // Prevent moderating users with higher role hierarchy
      if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
        await interaction.reply({
          content: `You cannot moderate <@${targetUser.id}> because they are higher in the role heirarchy than you.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // check if the bot has the required permissions in the channel
      if (
        !interaction.channel
          .permissionsFor(interaction.guild.members.me)
          .has(PermissionsBitField.Flags.ManageMessages)

        ||
        !interaction.channel
          .permissionsFor(interaction.guild.members.me)
          .has(PermissionsBitField.Flags.ModerateMembers) // discord.js still uses ModerateMembers instead of TimeoutMembers for channel-bot permissions

        ||
        !interaction.channel
          .permissionsFor(interaction.guild.members.me)
          .has(PermissionsBitField.Flags.BanMembers)
      ) {
        await interaction.reply({
          content:
            "I do not have permission to moderate this channel (need Manage Messages, Timeout Members, and Ban Members permission, contact an admin).",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Get previous points or default to 0
      let prevPoints = await getUserPoints(targetUser.id);

      // Add new points to the user's total
      const addPoints = interaction.options.getInteger("add");
      const currentPoints = prevPoints + addPoints;
      const pointsDelta = currentPoints - prevPoints;

      // Prevent adding negative points
      if (addPoints < 0) {
        await interaction.reply({
          content: "You cannot add negative points.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      let action;
      // Determine action based on point thresholds
      if (currentPoints >= 25) action = "Thousand Years Timeout";
      else if (currentPoints >= 20) action = "One Day Timeout";
      else if (currentPoints >= 15) action = "Long Timeout";
      else if (currentPoints >= 10) action = "Medium Timeout";
      else if (currentPoints >= 5) action = "Short Timeout";
      else action = "Warning";

      let duration;
      const reason = interaction.options.getString("reason");


      // Apply action based on determined action type
      switch (action) {
        case "Warning":
          // Send warning DM to user
          try {
            await interaction.client.modules.recordModerationEvent({
              targetUser,
              action,
              reason,
              interaction,
              pointsDelta,
              notifyUser: true,
            });
          } catch (err) {
            console.error(err);
          }
          break;
        case "Short Timeout":
          duration = "30m";
          break;
        case "Medium Timeout":
          duration = "6h";
          break;
        case "Long Timeout":
          duration = "12h";
          break;
        case "One Day Timeout":
          duration = "1d";
          break;
        case "Thousand Years Timeout":
          break;
      }

      // Apply timeout if duration is set
      if (duration !== undefined) {
        const durationMs = await interaction.client.modules.durationToMilliseconds(duration);

        // Timeout the member
        await targetMember.timeout(durationMs, reason);

        // Send timeout message to moderation channel
        await interaction.client.modules.recordModerationEvent({
          targetUser,
          action,
          reason,
          durationMs,
          interaction,
          pointsDelta,
          notifyUser: true,
        });
      }

      if (action === "Thousand Years Timeout") {
        if (interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
          const targetUser = interaction.options.getUser("member");
          const targetMember = await interaction.guild.members.fetch(targetUser.id);

          // Prevent banning users with higher role hierarchy
          if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
            await interaction.reply({
              content: `You cannot ban <@${targetUser.id}> because they are higher in the role heirarchy than you.`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const reason = interaction.options.getString("reason");
          const deleteMessages = interaction.options.getString("delete_messages");
          // Send ban message to moderation channel

          try {
            await interaction.client.modules.recordModerationEvent({
              targetUser,
              action,
              reason,
              interaction,
              pointsDelta,
              durationMs: 31540000000000, // actually a thousand years. though timeout is limited to 28 days so its fake lol
              notifyUser: true,
            });
          } catch (err) {
            // Silently fail if message cannot be sent
          }

          // Ban the member
          try {
            await targetMember.ban({
              reason,
              deleteMessageSeconds: deleteMessages === "true" ? 604000 : 0,
            });
          } catch (err) {
            console.error(err);
            await interaction.reply({
              content: "Failed to ban member. Check if my role is higher than the member's role.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
        }
      }
    } else {
      // User lacks timeout permission
      await interaction.reply({
        content: "You do not have permission to punish members (need Timeout Members permission).",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
