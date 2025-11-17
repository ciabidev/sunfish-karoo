const {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
  Collection,
} = require("discord.js");

// dictionary to store the points of each user based on their user.id
const points = new Collection();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moderation")
    .setDescription("moderation commands")

    .addSubcommand((subcommand) =>
      subcommand
        .setName("warn")
        .setDescription("warn a member")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to warn").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("the reason for the warning").setRequired(true)
        )
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("punish")
        .setDescription("timeout or ban a member based on their previous points")
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

    .addSubcommand((subcommand) =>
      subcommand
        .setName("removetimeout")
        .setDescription("remove timeout from a member")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to remove timeout").setRequired(true)
        )
    )

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
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "warn") {
    }
    if (subcommand === "punish") {
      if (interaction.member.permissions.has(PermissionsBitField.Flags.TimeoutMembers)) {
        const targetUser = interaction.options.getUser("member");
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
          await interaction.reply({
            content: `You cannot moderate <@${targetUser.id}> because they are simply better (they are higher in the role hierarchy than you).`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        let prevPoints = points.get(targetUser.id);

        if (prevPoints === undefined) prevPoints = 0;
        const addPoints = interaction.options.getInteger("add");
        const currentPoints = prevPoints + addPoints;
        points.set(targetUser.id, currentPoints);

        if (currentPoints < 5 || prevPoints === undefined) action = "warn";
        else if (currentPoints < 10) action = "Short Timeout";
        else if (currentPoints < 15) action = "Medium Timeout";
        else if (currentPoints < 20) action = "Long Timeout";
        else if (currentPoints < 25) action = "One Day Timeout";
        else action = "Thousand Years Timeout";

        let duration;
        const reason = interaction.options.getString("reason");

        console.log(`currentPoints: ${currentPoints}, prevPoints: ${prevPoints}`);
        switch (action) {
          case "warn":
            try {
              await interaction.client.modules.sendModerationDM({
                targetUser,
                guild: interaction.guild,
                action: "Warning",
                reason,
                actionedBy: interaction.user,
              });
            } catch(err) {
              // 
            }
            await interaction.client.modules.sendModerationMessage({
              targetUser,
              interaction,
              action,
              reason,
            });
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
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
              await interaction.reply("You do not have permission to ban members.");
            }
            await interaction.reply("Banning members is not implemented yet.");
            break;
        }
        
        if (duration !== undefined) {
          const durationMilliseconds = await interaction.client.modules.durationToMilliseconds(duration);
          const formattedDuration = await interaction.client.modules.formatMilliseconds(durationMilliseconds);
          await targetMember.timeout(durationMilliseconds, reason);

          await interaction.client.modules.sendModerationMessage({
            targetUser,
            interaction,
            action,
            reason,
            duration: formattedDuration,
          });

          try {
            await interaction.client.modules.sendModerationDM({
              targetUser,
              guild: interaction.guild,
              action,
              reason,
              duration: formattedDuration,
              actionedBy: interaction.user,
            });
          } catch (err) {
            //
          }
        }
      } else {
        await interaction.reply({
          content:
            "You do not have permission to punish members (need Timeout Members permission).",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (subcommand === "removetimeout") {
      if (interaction.member.permissions.has(PermissionsBitField.Flags.TimeoutMembers)) {
        const targetUser = interaction.options.getUser("member");
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
          await interaction.reply({
            content: `You cannot remove the timeout from <@${targetUser.id}> because they are higher in the role hierarchy than you.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (targetMember.communicationDisabledUntilTimestamp === null) {
          await interaction.reply({
            content: `<@${targetUser.id}> is not timed out`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await targetMember.timeout(null, "timeout");

        await interaction.reply({ content: `Removed timeout from <@${targetUser.id}>` });

        await interaction.client.modules.sendModerationDM({
          targetUser,
          guild: interaction.guild,
          action: "Remove Timeout",
          actionedBy: interaction.user,
        });
      } else {
        await interaction.reply({
          content: "You do not have permission to remove timeouts.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (subcommand === "kick") {
      if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const targetUser = interaction.options.getUser("member");
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        if (targetMember.roles.highest.position > interaction.member.roles.highest.position) {
          await interaction.reply({
            content: `You cannot kick <@${targetUser.id}> because they are simply better (they are higher in the role hierarchy than you).`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const reason = interaction.options.getString("reason");
        try {
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
        await interaction.reply({
          content: "You do not have permission to kick members. Who do you think you are?",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
