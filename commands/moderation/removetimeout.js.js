const {
    PermissionsBitField,
    MessageFlags,
  } = require("discord.js");

module.exports = {
    data: (
      parent // we use parent cause its gonna be imported into the main moderation.js script as a subcommand
    ) =>
      parent.addSubcommand((sc) =>
        sc
          .setName("removetimeout")
          .setDescription("remove timeout from a member")
          .addUserOption((option) =>
            option.setName("member").setDescription("the member to remove timeout").setRequired(true)
          )
      ),
    execute: async (interaction) => {
      if (interaction.member.permissions.has(PermissionsBitField.Flags.TimeoutMembers)) {
        const targetUser = interaction.options.getUser("member");
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

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

        // Send removal message to moderation channel
        await interaction.client.modules.sendModerationMessage({
          targetUser,
          action: "Remove Timeout",
          interaction,
          actionedBy: interaction.user,
        });

        // Send removal DM to user
        await interaction.client.modules.sendModerationDM({
          targetUser,
          guild: interaction.guild,
          action: "Remove Timeout",
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