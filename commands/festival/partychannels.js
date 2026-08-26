const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  SlashCommandSubcommandBuilder,
} = require("discord.js");

function partyChannelsComponents(channels, canManage, requestedPage = 0) {
  const pageCount = Math.max(1, Math.ceil(channels.length / 5));
  const page = Math.max(0, Math.min(requestedPage, pageCount - 1));
  const visibleChannels = channels.slice(page * 5, (page + 1) * 5);
  const pageLabel = pageCount > 1 ? `\n-# Page ${page + 1} of ${pageCount}` : "";
  const container = new ContainerBuilder()
    .setAccentColor(0xf5a623)
    .addTextDisplayComponents((text) =>
      text.setContent(
        `## 🎉 Festival Party Channels\nEach completed log awards the configured points!${pageLabel}`
      )
    );

  if (channels.length === 0) {
    container
      .addSeparatorComponents((separator) =>
        separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents((text) =>
        text.setContent("-# No party channels have been configured yet.")
      );
  }

  for (const channel of visibleChannels) {
    const pointLabel = channel.points === 1 ? "point" : "points";
    container
      .addSeparatorComponents((separator) =>
        separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(`### <#${channel.channelId}>\n\`${channel.points}\` ${pointLabel} per log`)
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(`festival_party_channels:edit:${channel.channelId}`)
              .setLabel("Edit")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(!canManage)
          )
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`festival_party_channels:remove:${channel.channelId}:${page}`)
            .setLabel("Remove")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!canManage)
        )
      );
  }

  if (pageCount > 1) {
    container.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`festival_party_channels:page:${page - 1}`)
          .setLabel("Previous")
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId(`festival_party_channels:page:${page + 1}`)
          .setLabel("Next")
          .setEmoji("▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === pageCount - 1)
      )
    );
  }

  container
    .addSeparatorComponents((separator) =>
      separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("festival_party_channels:add")
          .setLabel("Add Party Channel")
          .setEmoji("➕")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!canManage)
      )
    );

  return [container];
}

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("partychannels")
    .setDescription("Configure channels where festival parties can be logged"),

  async execute(interaction) {
    const channels = await interaction.client.modules.database.getFestivalPartyChannels();
    return interaction.reply({
      components: partyChannelsComponents(
        channels,
        interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID)
      ),
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
  partyChannelsComponents,
};
