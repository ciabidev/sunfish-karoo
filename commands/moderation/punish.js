const {
  PermissionsBitField,
  MessageFlags,
  Collection,
} = require("discord.js");


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
      if (currentPoints < 5 || prevPoints === undefined) action = "warn";
      else if (currentPoints < 10) action = "Short Timeout";
      else if (currentPoints < 15) action = "Medium Timeout";
      else if (currentPoints < 20) action = "Long Timeout";
      else if (currentPoints < 25) action = "One Day Timeout";
      else action = "Thousand Years Timeout";

      let duration;
      const reason = interaction.options.getString("reason");

      console.log(`currentPoints: ${currentPoints}, prevPoints: ${prevPoints}`);

      // Apply action based on determined action type
      switch (action) {
        case "warn":
          // Send warning DM to user
          try {
            await interaction.client.modules.recordModerationEvent({
              targetUser,
              action: "Warning",
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
          // Check if moderator has ban permissions
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            await interaction.reply("You do not have permission to ban members.");
          }
          await interaction.reply("Banning members is not implemented yet.");
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
    } else {
      // User lacks timeout permission
      await interaction.reply({
        content: "You do not have permission to punish members (need Timeout Members permission).",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
