const {
  PermissionsBitField,
  MessageFlags,
  SlashCommandSubcommandBuilder,
  SeparatorSpacingSize,
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
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
    if (!cases.length) {
      await interaction.reply({
        content: `<@${targetUser.id}> is sweet as pie`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const pages = interaction.client.modules.chunkArray(cases, 3);
    const points = await interaction.client.modules.supabase.getUserPoints(targetUser.id);
    let pageIndex = 0;

    function renderPage() {
      const page = pages[pageIndex];

      const container = new ContainerBuilder().addTextDisplayComponents(
        (t) => t.setContent(`## Moderation Cases for <@${targetUser.id}> `),
        (t) => t.setContent(`**Points:** ${points}\n**User ID:** ${targetUser.id}\n`)
      );

      for (const caseData of page) {
        const { action, reason, actioned_by, duration_ms, points_delta, id, created_at } = caseData;

        const dateUnix = Math.floor(new Date(created_at).getTime() / 1000);
        const duration = duration_ms ? interaction.client.modules.formatMilliseconds(duration_ms) : null;

        container.addTextDisplayComponents(
          (t) => t.setContent(`### ${action} | case #${id}`),
          (t) => t.setContent(`Actioned by <@${actioned_by}> (${actioned_by}) <t:${dateUnix}:R>`),
          (t) => t.setContent(`**Reason:** ${reason || "No reason provided"}`),
          ...(duration ? [(t) => t.setContent(`**Duration:** ${duration}`)] : []),
          (t) => t.setContent(`**Point Change:** ${points_delta > 0 ? "+" : ""}${points_delta}\n`)
        );

        container.addSeparatorComponents((s) =>
          s.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        );
      }

      return container;
    }
    const mainText = renderPage();

  

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

    const response = await interaction.reply({
      content: '',
      components,
      flags: MessageFlags.IsComponentsV2,
      withResponse: true,
    });

    const collector = response.resource.message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 3_600_000, // 1 hour
    });
  

  collector.on('collect', async (i) => {
    if (i.customId === "previous-page") {
      pageIndex--;
      if (pageIndex < 0) {
        pageIndex = pages.length - 1;
      }
    } else if (i.customId === "next-page") {
      pageIndex++;
      if (pageIndex >= pages.length) {
        pageIndex = 0;
      }
    }

    const updatedMainText = renderPage();
    await i.update({ components: [updatedMainText, pageSelector] }); // update the message with the new components
  });

  },
};
