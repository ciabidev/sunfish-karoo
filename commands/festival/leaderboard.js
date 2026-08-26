const { SlashCommandSubcommandBuilder, ContainerBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("leaderboard")
    .setDescription("Show top festival hosts")
    .addBooleanOption((option) =>
      option.setName("reset").setDescription("Reset the leaderboard").setRequired(false),
    ),
  execute: async (interaction) => {
    await interaction.deferReply();
    const database = interaction.client.modules.database;
    const top = await database.getFestivalTop(10);
    const reset = interaction.options.getBoolean("reset", false);

    if (reset) {
      if (!interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID)) {
        return interaction.editReply({
          content: "You do not have permission to reset the leaderboard.",
          flags: MessageFlags.Ephemeral,
        });
      }
      await database.resetFestival();
      return interaction.editReply({
        content: "Reset the leaderboard.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const lines = [];

    if (top.length > 0) {
      for (let i = 0; i < top.length; i += 1) {
        console.log(top[i]);
        const entry = top[i];
        const score = entry.score ?? 0;

        let prefix = "";
        if (i < 4) {
          prefix = "## ";
        }
        lines.push(
          `${prefix}${i + 1}. <@${entry.user}> — \`${score.toLocaleString("en-US")}\` points`,
        );
      }
    }

    const currentUserId = interaction.user.id;
    const currentEntry = await database.getFestivalUser(currentUserId);
    const currentScore = currentEntry?.score ?? 0;
    const isInTop = top.some((entry) => entry.user === currentUserId);

    if (!isInTop && top.length > 0) {
      const rank = await database.getFestivalRank(currentUserId, currentScore);
      lines.push("...and you:");
      // FIX: Added back the backticks and "points" string to match the top style
      lines.push(
        `${rank ?? "?"}. <@${currentUserId}> — \`${currentScore.toLocaleString("en-US")}\` points`,
      );
    }

    const emperorCount = Math.min(top.length, 4);
    const numberWord =
      emperorCount <= 0 ? "Four" : ["One", "Two", "Three", "Four"][emperorCount - 1] || "Four";

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${
          top.length === 0
            ? "No one's hosted yet. Be the first!"
            : `## The ${numberWord} ${emperorCount === 1 ? "Emperor" : "Emperors"}\n-# of the festival\n${lines.join("\n")}\n\n-# Anyone can participate in the festival! <#${process.env.FESTIVAL_CHANNEL_ID}>`
        }`,
      ),
    );

    return interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
