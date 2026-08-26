const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  SlashCommandSubcommandBuilder,
} = require("discord.js");

function festivalInventoryComponents(items, requestedPage = 0) {
  const pageCount = Math.max(1, Math.ceil(items.length / 6));
  const page = Math.max(0, Math.min(requestedPage, pageCount - 1));
  const visibleItems = items.slice(page * 6, (page + 1) * 6);
  const pageLabel = pageCount > 1 ? `\n-# Page ${page + 1} of ${pageCount}` : "";
  const container = new ContainerBuilder()
    .setAccentColor(0xf5a623)
    .addTextDisplayComponents((text) =>
      text.setContent(`## 🎒 Festival Inventory\nItems you have purchased and not collected.${pageLabel}`)
    );

  if (items.length === 0) {
    container
      .addSeparatorComponents((separator) =>
        separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents((text) =>
        text.setContent("-# Your festival inventory is empty.")
      );
  }

  for (const item of visibleItems) {
    const status = item.requested ? " • **Collection requested**" : "";
    const content = `### ${item.name}\n${item.description}\n**Quantity:** \`${item.quantity}\`${status}`;
    container.addSeparatorComponents((separator) =>
      separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    if (item.imageUrl) {
      container.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) => text.setContent(content))
          .setThumbnailAccessory((thumbnail) =>
            thumbnail.setURL(item.imageUrl).setDescription(item.name)
          )
      );
    } else {
      container.addTextDisplayComponents((text) => text.setContent(content));
    }
  }

  if (pageCount > 1) {
    container.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`festival_inventory:page:${page - 1}`)
          .setLabel("Previous")
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId(`festival_inventory:page:${page + 1}`)
          .setLabel("Next")
          .setEmoji("▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === pageCount - 1)
      )
    );
  }

  const hasPendingRequest = items.some((item) => item.requested);
  container
    .addSeparatorComponents((separator) =>
      separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("festival_inventory:checkout")
          .setLabel(
            items.length === 0
              ? "Inventory Empty"
              : hasPendingRequest
                ? "Collection Requested"
                : "Request Collection"
          )
          .setStyle(hasPendingRequest || items.length === 0 ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(hasPendingRequest || items.length === 0)
      )
    );

  return [container];
}

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("inventory")
    .setDescription("View and collect your festival shop purchases"),

  async execute(interaction) {
    const items = await interaction.client.modules.database.getFestivalInventory(interaction.user.id);
    return interaction.reply({
      components: festivalInventoryComponents(items),
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
  festivalInventoryComponents,
};
