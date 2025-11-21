const {
  PermissionsBitField,
  MessageFlags,
  Collection,
} = require("discord.js");


// get points variable from moderation.js
const points = new Collection();
module.exports = {
  data: (
    parent // we use parent cause its gonna be imported into the main moderation.js script as a subcommand
  ) =>
    parent.addSubcommand((sc) =>
      sc
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
    ),
  execute: async (interaction) => {
    if (interaction.member.permissions.has(PermissionsBitField.Flags.TimeoutMembers)) {
      const targetUser = interaction.options.getUser("member");
      const targetMember = await interaction.guild.members.fetch(targetUser.id);

      // Prevent moderating users with higher role hierarchy
      if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
        await interaction.reply({
          content: `You cannot moderate <@${targetUser.id}> because they are simply better (they are higher in the role hierarchy than you).`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Get previous points or default to 0
      let prevPoints = points.get(targetUser.id);
      if (prevPoints === undefined) prevPoints = 0;

      // Add new points to the user's total
      const addPoints = interaction.options.getInteger("add");
      const currentPoints = prevPoints + addPoints;
      points.set(targetUser.id, currentPoints);

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
            await interaction.client.modules.sendModerationDM({
              targetUser,
              guild: interaction.guild,
              action: "Warning",
              reason,
              actionedBy: interaction.user,
              addPoints,
            });
          } catch (err) {
            // Silently fail if DM cannot be sent
          }

          // Send warning message to moderation channel
          try {
            await interaction.client.modules.sendModerationMessage({
              targetUser,
              interaction,
              action,
              actionedBy: interaction.user,
              reason,
              addPoints,
            });
          } catch (err) {
            // Silently fail if message cannot be sent
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
        const durationMilliseconds = await interaction.client.modules.durationToMilliseconds(
          duration
        );
        const formattedDuration = await interaction.client.modules.formatMilliseconds(
          durationMilliseconds
        );

        // Timeout the member
        await targetMember.timeout(durationMilliseconds, reason);

        // Send timeout message to moderation channel
        try {
          await interaction.client.modules.sendModerationMessage({
            targetUser,
            action,
            reason,
            formattedDuration,
            interaction,
            actionedBy: interaction.user,
            addPoints,
          });
        } catch (err) {
          // Silently fail if message cannot be sent
        }

        // Send timeout DM to user
        try {
          await interaction.client.modules.sendModerationDM({
            targetUser,
            guild: interaction.guild,
            action,
            reason,
            formattedDuration,
            actionedBy: interaction.user,
            addPoints,
          });
        } catch (err) {
          // Silently fail if DM cannot be sent
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
