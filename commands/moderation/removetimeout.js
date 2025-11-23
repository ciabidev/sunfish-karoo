const {
    PermissionsBitField,
    MessageFlags,
  } = require("discord.js");
const { SlashCommandSubcommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("removetimeout")
    .setDescription("remove timeout from a member")
    .addUserOption((option) =>
      option.setName("member").setDescription("the member to remove timeout").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("the reason to remove timeout").setRequired(false)
    ),
  execute: async (interaction) => {
    if (interaction.member.permissions.has(PermissionsBitField.Flags.TimeoutMembers)) {
      const targetUser = interaction.options.getUser("member");
      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const reason = interaction.options.getString("reason");
      // Prevent removing timeouts on users with higher role hierarchy
      if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
        await interaction.reply({
          content: `You cannot remove the timeout from <@${targetUser.id}> because they are higher in the role hierarchy than you.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Check if member is actually timed out
      if (targetMember.communicationDisabledUntilTimestamp === null) {
        await interaction.reply({
          content: `<@${targetUser.id}> is not timed out`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Remove timeout by setting it to null
      await targetMember.timeout(null, "timeout");

     await interaction.client.modules.recordModerationEvent({
        targetUser,
        interaction,
        action: "Remove Timeout",
        reason,
        actionedBy: interaction.user,
      });
    } else {
      // User lacks timeout permission
      await interaction.reply({
        content: "You do not have permission to remove timeouts.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};