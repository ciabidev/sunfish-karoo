const { PermissionsBitField, MessageFlags, SlashCommandSubcommandBuilder } = require("discord.js");

const { points } = require("./main");
module.exports = {
  data: new SlashCommandSubcommandBuilder()
        .setName("removepoints")
        .setDescription("remove points from a member")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to remove points from").setRequired(true)
        )
        .addIntegerOption((option) =>
          option.setName("points").setDescription("the amount of points to remove").setRequired(true)
        ),
  execute: async (interaction) => {
    if (interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      const targetUser = interaction.options.getUser("member");
      const targetMember = await interaction.guild.members.fetch(targetUser.id);

      // Prevent removing points from users with higher role hierarchy
      if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
        await interaction.reply({
          content: `You cannot remove points from <@${targetUser.id}> because they are higher in the role heirarchy than you.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Get previous points or default to 0
      let prevPoints = points.get(targetUser.id);
      if (prevPoints === undefined) prevPoints = 0;

      // Subtract points from user's total
      const removePoints = interaction.options.getInteger("points");
      const currentPoints = prevPoints - removePoints;
      points.set(targetUser.id, currentPoints);

      // Send removal message to moderation channel
      await interaction.client.modules.sendModerationMessage({
        targetUser,
        action: "Remove Points",
        interaction,
        actionedBy: interaction.user,
        removePoints,
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