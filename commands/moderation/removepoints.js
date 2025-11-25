const { PermissionsBitField, MessageFlags, SlashCommandSubcommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
        .setName("removepoints")
        .setDescription("remove points from a member")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to remove points from").setRequired(true)
        )
        .addIntegerOption((option) =>
          option.setName("points").setDescription("the amount of points to remove").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("the reason to remove points").setRequired(true)
        ),
  execute: async (interaction) => {
    if (interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      const targetUser = interaction.options.getUser("member");
      const reason = interaction.options.getString("reason");
      const removePoints = interaction.options.getInteger("points");
      try {
        await interaction.guild.members.fetch(targetUser.id);
      } catch (error) {
        await interaction.reply({
          content: `<@${targetUser.id}> is not in the server.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      // Prevent removing points from users with higher role hierarchy
      if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
        await interaction.reply({
          content: `You cannot remove points from <@${targetUser.id}> because they are higher in the role heirarchy than you.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Prevent removing negative points
      if (removePoints < 0) {
        await interaction.reply({
          content: "You cannot remove negative points.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      
      // Get previous points or default to 0
      let prevPoints = await interaction.client.modules.supabase.getUserPoints(targetUser.id);
      if (prevPoints === undefined) prevPoints = 0;

      // Subtract points from user's total
      const currentPoints = prevPoints - removePoints;
      const pointsDelta = currentPoints - prevPoints;

      // Send removal message to moderation channel
      await interaction.client.modules.recordModerationEvent({
        targetUser,
        interaction,
        action: "Remove Points",
        reason,
        actionedBy: interaction.user,
        pointsDelta,
      });
    } else {
      // User lacks ban permission
      await interaction.reply({
        content: "You do not have permission to remove points (need Ban Members permission, try contacting an admin if you're a moderator).",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};