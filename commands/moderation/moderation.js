const {
  SlashCommandBuilder,
  PermissionsBitField,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moderation")
    .setDescription("moderation commands")

    .addSubcommand((subcommand) => subcommand
      .setName("warn")
      .setDescription("warn a member")
      .addUserOption((option) => option.setName("member").setDescription("the member to warn").setRequired(true))
      .addStringOption((option) => option.setName("reason").setDescription("the reason for the warning").setRequired(true))
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("timeout")
        .setDescription("timeout a member")
        .addUserOption((option) =>
          option.setName("member").setDescription("the member to timeout").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("duration")
            .setDescription("the duration of the timeout in 1d, 1h, 1m, 1s")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("the reason for the timeout").setRequired(true)
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

  // we need to use a database to store the bans
  // .addSubcommand((subcommand) =>
  //   subcommand
  //     .setName("ban")
  //     .setDescription("ban a member from the server")
  //     .addUserOption((option) =>
  //       option.setName("member").setDescription("the member to ban").setRequired(true)
  //     )
  // ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "warn") {
      if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const user = interaction.options.getUser("member");

        const member = await interaction.guild.members.fetch(user.id);

        // check if the member's heirarchy is above the interaction.user
        if (member.roles.highest.position > interaction.member.roles.highest.position) {
          await interaction.reply({content: `You cannot warn <@${user.id}> because they are simply better (they are higher in the role hierarchy than you).`
          , flags: MessageFlags.Ephemeral});
          return;
        }

        const reason = interaction.options.getString("reason");

        try {
          await interaction.client.modules.sendModerationDM({
            user,
            guild: interaction.guild,
            action: "Warning",
            reason,
            actionedBy: interaction.user,
          });
        } catch (err) {
          console.log("Failed to DM user:", err);
        }

        await interaction.reply(`Warned <@${user.id}>. Reason: ${reason}`);
      } else {
        await interaction.reply({
          content: "You do not have permission to warn members.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    if (subcommand === "timeout") {
      if (interaction.member.permissions.has(PermissionsBitField.Flags.TimeoutMembers)) {
        const user = interaction.options.getUser("member");
        const member = await interaction.guild.members.fetch(user.id);
        if (member.roles.highest.position > interaction.member.roles.highest.position) {
          await interaction.reply({
            content: `You cannot timeout <@${user.id}> because they are higher in the role hierarchy than you.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        // get the dynamic duration in milliseconds
        const duration = await interaction.client.modules.durationToMilliseconds(
          interaction.options.getString("duration")
        );

        const reason = interaction.options.getString("reason");

        await member.timeout(duration, reason);
        // send a reply with the member's name and the duration
        const formattedDuration = await interaction.client.modules.formatMilliseconds(duration);

        await interaction.reply(
          `Timed out <@${user.id}> for ${formattedDuration}. \n Reason: ${reason}`
        );

        await interaction.client.modules.sendModerationDM({
          user,
          guild: interaction.guild,
          action: "Timeout",
          reason,
          duration: formattedDuration,
          actionedBy: interaction.user,
        });
      }
    }

    if (subcommand === "removetimeout") {
      if (interaction.member.permissions.has(PermissionsBitField.Flags.TimeoutMembers)) {
        const user = interaction.options.getUser("member");
        const member = await interaction.guild.members.fetch(user.id);

        if (member.roles.highest.position > interaction.member.roles.highest.position) {
          await interaction.reply({
            content:`You cannot remove the timeout from <@${user.id}> because they are higher in the role hierarchy than you.`
            , flags: MessageFlags.Ephemeral
          });
          return;
        }

        if (member.communicationDisabledUntilTimestamp === null) {
          await interaction.reply({content: `<@${user.id}> is not timed out`, flags: MessageFlags.Ephemeral});
          return;
        }

        await member.timeout(null, "timeout");
        // send a reply with the member's name and the duration

        await interaction.reply({content: `Removed timeout from <@${user.id}>`});

        await interaction.client.modules.sendModerationDM({
          user,
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
        const user = interaction.options.getUser("member");

        const member = await interaction.guild.members.fetch(user.id);

        // check if the member's heirarchy is above the interaction.user
        if (member.roles.highest.position > interaction.member.roles.highest.position) {
          await interaction.reply({content: `You cannot kick <@${user.id}> because they are simply better (they are higher in the role hierarchy than you).`
          , flags: MessageFlags.Ephemeral});
          return;
        }

        const reason = interaction.options.getString("reason");
        try {

          try {
            await interaction.client.modules.sendModerationDM({
              user,
              guild: interaction.guild,
              action: "Kick",
              reason,
              actionedBy: interaction.user,
            });
          } catch (err) {
            console.log("Failed to DM user:", err);
          }

          await member.kick(reason);

          
        } catch (err) {
          console.error(err);
          await interaction.reply({
            content: "Failed to kick member. Check if my role is higher than the member's role.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.reply(`Kicked <@${user.id}>. Reason: ${reason}`);
      } else {
        await interaction.reply({
          content: "You do not have permission to kick members. Who do you think you are?",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
