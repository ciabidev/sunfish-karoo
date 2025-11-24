const {
  PermissionsBitField,
  MessageFlags,
  SlashCommandSubcommandBuilder,
  SeparatorSpacingSize,
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("cases")
    .setDescription("view moderation cases")
    .addUserOption((option) =>
      option.setName("member").setDescription("the member to view cases for").setRequired(true)
    ),

  execute: async (interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.TimeoutMembers)) {
      await interaction.reply({
        content:
          "You do not have permission to view cases (need Timeout Members permission, try contacting an admin if you're a moderator).",
        flags: MessageFlags.Ephemeral,
      });
    }
    const targetUser = interaction.options.getUser("member");
    const cases = await interaction.client.modules.supabase.getCases(targetUser.id);

    const pages = interaction.client.modules.chunkArray(cases, 3);
    const points = await interaction.client.modules.supabase.getUserPoints(targetUser.id);
    let currentPage = 0;

    // Build initial page
    const mainText = new ContainerBuilder().addTextDisplayComponents(
      (t) => t.setContent(`## Moderation Cases for <@${targetUser.id}>`),
      (t) => t.setContent(`**Points:** ${points}\n`)
    );

    for (const caseData of pages[currentPage]) {
      const action = caseData.action;
      const reason = caseData.reason;
      const actionedById = caseData.actioned_by;
      const durationMs = caseData.duration_ms;
      const pointsDelta = caseData.points_delta;
      const caseId = caseData.id;
      const formattedDuration = interaction.client.modules.formatMilliseconds(durationMs);
      const dateUnix = Math.floor(new Date(caseData.created_at).getTime() / 1000);

      mainText.addTextDisplayComponents(
        (t) => t.setContent(`### ${action} | case #${caseId}`),
        (t) => t.setContent(`Actioned by <@${actionedById}> <t:${dateUnix}:R>`),
        (t) => t.setContent(`**Reason: ** ${reason ? reason : "No reason provided"}\n`),
        ...(durationMs ? [(t) => t.setContent(`**Duration: ** ${formattedDuration}\n`)] : []),
        (t) => t.setContent(`**Point Change: ** ${pointsDelta > 0 ? "+" : ""}${pointsDelta}\n`)
      );

      mainText.addSeparatorComponents((separator) =>
        separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      );
    }

    // create buttons
    const previousPageButton = new ButtonBuilder()
      .setCustomId("previous-page")
      .setLabel("Previous Page")
      .setStyle(ButtonStyle.Secondary);

    const nextPageButton = new ButtonBuilder()
      .setCustomId("next-page")
      .setLabel("Next Page")
      .setStyle(ButtonStyle.Secondary);
    const pageSelector = new ActionRowBuilder().addComponents(previousPageButton, nextPageButton);

    const components = [mainText, pageSelector];

    const message = await interaction.reply({
      components,
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.isButton(),
      time: 1000 * 60 * 15,
    });

    // handle button clicks
    collector.on("collect", async (i) => {
      if (i.customId === "previous-page") {
        currentPage--;
        if (currentPage < 0) {
          currentPage = pages.length - 1;
        }
      } else if (i.customId === "next-page") {
        currentPage++;
        if (currentPage >= pages.length) {
          currentPage = 0;
        }
      }

      const newMainText = new ContainerBuilder().addTextDisplayComponents(
        (t) => t.setContent(`## Moderation Cases for <@${targetUser.id}>`),
        (t) => t.setContent(`**Points:** ${points}\n`)
      );

      for (const caseData of pages[currentPage]) {
        const action = caseData.action;
        const reason = caseData.reason;
        const actionedById = caseData.actioned_by;
        const durationMs = caseData.duration_ms;
        const pointsDelta = caseData.points_delta;
        const caseId = caseData.id;
        const formattedDuration = interaction.client.modules.formatMilliseconds(durationMs);
        const dateUnix = Math.floor(new Date(caseData.created_at).getTime() / 1000);

        newMainText.addTextDisplayComponents(
          (t) => t.setContent(`### ${action} | case #${caseId}`),
          (t) => t.setContent(`Actioned by <@${actionedById}> <t:${dateUnix}:R>`),
          (t) => t.setContent(`**Reason: ** ${reason ? reason : "No reason provided"}\n`),
          ...(durationMs ? [(t) => t.setContent(`**Duration: ** ${formattedDuration}\n`)] : []),
          (t) => t.setContent(`**Point Change: ** ${pointsDelta > 0 ? "+" : ""}${pointsDelta}\n`)
        );

        newMainText.addSeparatorComponents((separator) =>
          separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        );
      }

        await i.deferUpdate();
        await i.message.edit({ components: [newMainText, pageSelector] });
    });
  },
};
