const { PermissionsBitField, MessageFlags, SlashCommandSubcommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")

    .addUserOption((option) =>
      option.setName("user_id").setDescription("The user ID to unban ").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for the unban").setRequired(true)
    ),

  execute: async (interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({
        content: "You do not have permission to unban users.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetUserId = interaction.options.getUser("user_id"); // returns User or null
    const reason = interaction.options.getString("reason");

    // Attempt to unban
    try {
      await interaction.guild.members.unban(targetUserId, reason);
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: `Failed to unban <@${targetUserId}>. Check if they are not banned or my role is too low.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Send moderation log / DM
    try {
      await interaction.client.modules.sendModerationMessage({
        targetUser: targetUserId,
        action: "Unban",
        reason,
        interaction,
        actionedBy: interaction.user,
      });

      // bots sometimes cant send messages to users not in the guild
    } catch {}

    try {
      await interaction.client.modules.sendModerationDM({
        targetUser: targetUserId,
        guild: interaction.guild,
        action: "Unban",
        reason,
        actionedBy: interaction.user,
      });
    } catch {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `Failed to messsage <@${targetUserId}` });
      }
    }
  },
};
