const { PermissionsBitField, MessageFlags, SlashCommandSubcommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
        .setName("kick")
        .setDescription("kick a member from the server")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to kick").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("the reason for the kick").setRequired(true)
        ),
  execute: async (interaction) => {
    if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      const targetUser = interaction.options.getUser("member");
      const targetMember = await interaction.guild.members.fetch(targetUser.id);

      // Prevent kicking users with higher role hierarchy
      if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
        await interaction.reply({
          content: `You cannot kick <@${targetUser.id}> because they are higher in the role heirarchy than you.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // check if the bot has permission to kick in the channel
      if (
        !interaction.channel
          .permissionsFor(interaction.guild.members.me)
          .has(PermissionsBitField.Flags.KickMembers)
      ) {
        await interaction.reply({
          content:
            "I do not have permission to kick users in this channel (I need Kick Members permission).",
          flags: MessageFlags.Ephemeral,
        });
      }

      const reason = interaction.options.getString("reason");
      try {
        // Try to send kick DM to user first
        try {
          await interaction.client.modules.recordModerationEvent({
            targetUser,
            guild: interaction.guild,
            action: "Kick",
            reason,
            actionedBy: interaction.user,
          });
        } catch (err) {
          console.log("Failed to DM user:", err);
        }

        // Kick the member
        await targetMember.kick(reason);
      } catch (err) {
        console.error(err);
        await interaction.reply({
          content: "Failed to kick member. Check if my role is higher than the member's role.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply(`Kicked <@${targetUser.id}>. Reason: ${reason}`);
    } else {
      // User lacks kick permission
      await interaction.reply({
        content: "You do not have permission to kick members. Who do you think you are?",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};