const { PermissionsBitField, MessageFlags } = require("discord.js");

const { SlashCommandSubcommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("ban")
    .setDescription("ban a member from the server")
    .addUserOption(option =>
      option
        .setName("member")
        .setDescription("the member to ban")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("the reason for the ban")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("delete_messages")
        .setDescription("whether to delete messages from the user")
        .addChoices(
          { name: "Yes", value: "true" },
          { name: "No", value: "false" }
        )
    ),
  execute: async (interaction) => {
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
        await interaction.client.modules.sendModerationMessage({
          targetUser,
          action: "Ban",
          reason,
          interaction,
          actionedBy: interaction.user,
        });

        // Send ban DM to user
        await interaction.client.modules.sendModerationDM({
          targetUser,
          guild: interaction.guild,
          action: "Ban",
          reason,
          actionedBy: interaction.user,
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
  },
};
