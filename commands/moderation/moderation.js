const {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
  Collection,
} = require("discord.js");

// Collection to store moderation points for each user
// Key: user.id, Value: points (number)
const points = new Collection();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moderation")
    .setDescription("moderation commands")
    // Punish command - applies timeout or ban based on accumulated points
    .addSubcommand((subcommand) =>
      subcommand
        .setName("punish")
        .setDescription("warn, timeout, or ban a member based on their previous points")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to punish").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("the reason for the punishment").setRequired(true)
        )
        .addIntegerOption((option) =>
          option.setName("add").setDescription("the amount of points to add to this member").setRequired(true)
        )
    )

    // Remove Timeout command - removes active timeout from a member
    .addSubcommand((subcommand) =>
      subcommand
        .setName("removetimeout")
        .setDescription("remove timeout from a member")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to remove timeout").setRequired(true)
        )
    )

    // Kick command - removes a member from the server
    .addSubcommand((subcommand) =>
      subcommand
        .setName("kick")
        .setDescription("kick a member from the server")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to kick").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("the reason for the kick").setRequired(true)
        )
    )

    // Ban command - permenantly bans a member from the server
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ban")
        .setDescription("ban a member from the server")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to ban").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("the reason for the ban").setRequired(true)
        )
        .addStringOption ((option) =>
          option.setName("delete_messages")
            .setDescription("whether to delete messages from the user")
            .setRequired(false)
            .addChoices(
              { name: "Yes", value: "true" },
              { name: "No", value: "false" }
            )
        )
    )

    // Remove Points command - removes moderation points from a member
    .addSubcommand((subcommand) =>
      subcommand
        .setName("removepoints")
        .setDescription("remove points from a member")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to remove points from").setRequired(true)
        )
        .addIntegerOption((option) =>
          option.setName("points").setDescription("the amount of points to remove").setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    // Handle punish subcommand - applies timeout or ban based on points
    if (subcommand === "punish") {
      // Check if user has permission to timeout members
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
            } catch(err) {
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
          const durationMilliseconds = await interaction.client.modules.durationToMilliseconds(duration);
          const formattedDuration = await interaction.client.modules.formatMilliseconds(durationMilliseconds);
          
          // Timeout the member
          await targetMember.timeout(durationMilliseconds, reason);

          // Send timeout message to moderation channel
          try{
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
          content:
            "You do not have permission to punish members (need Timeout Members permission).",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // Handle removetimeout subcommand - removes active timeouts
    if (subcommand === "removetimeout") {
      // Check if user has permission to timeout members
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
    }

    // Handle kick subcommand - removes member from server
    if (subcommand === "kick") {
      // Check if user has permission to kick members
      if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const targetUser = interaction.options.getUser("member");
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        // Prevent kicking users with higher role hierarchy
        if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
          await interaction.reply({
            content: `You cannot kick <@${targetUser.id}> because they are simply better (they are higher in the role hierarchy than you).`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const reason = interaction.options.getString("reason");
        try {
          // Try to send kick DM to user first
          try {
            await interaction.client.modules.sendModerationDM({
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
    }

    if (subcommand === "ban") {
      // Check if user has permission to ban members
      if (interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const targetUser = interaction.options.getUser("member");
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        // Prevent banning users with higher role hierarchy
        if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
          await interaction.reply({
            content: `You cannot ban <@${targetUser.id}> because they are simply better (they are higher in the role hierarchy than you).`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        
        const reason = interaction.options.getString("reason");
        const deleteMessages = interaction.options.getString("delete_messages");


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
          await targetMember.ban({ reason, deleteMessageSeconds: deleteMessages === "true" ? 604000 : 0 });
        } catch (err) {
          console.error(err);
          await interaction.reply({
            content: "Failed to ban member. Check if my role is higher than the member's role.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Send ban message to moderation channel
        
      }
      }
    // Handle removepoints subcommand - removes moderation points from a member
    if (subcommand === "removepoints") {
      // Check if user has permission to ban members (required for removing points)
      if (interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const targetUser = interaction.options.getUser("member");
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        // Prevent removing points from users with higher role hierarchy
        if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
          await interaction.reply({
            content: `You cannot remove points from <@${targetUser.id}> because they are simply better (they are higher in the role hierarchy than you).`,
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

        // Send removal DM to user
        await interaction.client.modules.sendModerationDM({
          targetUser,
          guild: interaction.guild,
          action: "Remove Points",
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
    }
  },
};
