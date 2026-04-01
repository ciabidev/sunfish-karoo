const {
  SlashCommandSubcommandBuilder,
  ContainerBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("leaderboard")
    .setDescription("Show top festival hosts"),

  execute: async (interaction) => {
    await interaction.deferReply();

    const supabase = interaction.client.modules.supabase;
    const top = await supabase.getFestivalTop(10);

    const lines = [];
    if (top.length === 0) {
      lines.push("No hosts yet.");
    } else {
      for (let i = 0; i < top.length; i += 1) {
        const entry = top[i];
        const score = entry.score ?? 0;
        if (i < 3) {
          prefix = "## ";
          if (i === 0) {
            prefix = " ## 👑 ";
          }
        }
        
        lines.push(`${prefix}${i + 1}. <@${entry.user}> — \`${score}\` points`);
      }
    }

    const currentUserId = interaction.user.id;
    const currentEntry = await supabase.getFestivalUser(currentUserId);
    const currentScore = currentEntry?.score ?? 0;
    const isInTop = top.some((entry) => entry.user === currentUserId);

    if (!isInTop) {
      const rank = await supabase.getFestivalRank(currentUserId, currentScore);
      lines.push("...");
      lines.push(`${rank ?? "?"}. <@${currentUserId}> — ${currentScore}`);
    }

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `## Festival Host Leaderboard\n${lines.join("\n")}\n-# Anyone can participate in the festival! <#${process.env.FESTIVAL_CHANNEL_ID}>`
      ),
    );

    return interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
