const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  SlashCommandSubcommandBuilder,
} = require("discord.js");

function festivalShopComponents(items, canManage, points, requestedPage = 0) {
  const pageCount = Math.max(1, Math.ceil(items.length / 4));
  const page = Math.max(0, Math.min(requestedPage, pageCount - 1));
  const visibleItems = items.slice(page * 4, (page + 1) * 4);
  const pageLabel = pageCount > 1 ? `\n-# Page ${page + 1} of ${pageCount}` : "";
  const container = new ContainerBuilder()
    .setAccentColor(0xf5a623)
    .addTextDisplayComponents((text) =>
      text.setContent(`## 🛍️ Festival Shop\n**Your points:** \`${points}\`${pageLabel}`)
    );

  if (items.length === 0) {
    container
      .addSeparatorComponents((separator) =>
        separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents((text) =>
        text.setContent("-# There are no festival shop items yet.")
      );
  }

  for (const item of visibleItems) {
    const pointLabel = item.price === 1 ? "point" : "points";
    container
      .addSeparatorComponents((separator) =>
        separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((text) =>
            text.setContent(
              `### ${item.name}\n${item.description}\n**Price:** \`${item.price}\` ${pointLabel} • **Stock:** \`${item.stock}\``
            )
          )
          .setThumbnailAccessory((thumbnail) =>
            thumbnail.setURL(item.imageUrl).setDescription(item.name)
          )
      );

    if (canManage) {
      container.addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`festival_shop:edit:${item._id}:${page}`)
            .setLabel("Edit")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`festival_shop:remove:${item._id}:${page}`)
            .setLabel("Remove")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger)
        )
      );
    } else {
      container.addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`festival_shop:buy:${item._id}:${page}`)
            .setLabel(item.stock > 0 ? "Buy" : "Out of Stock")
            .setStyle(item.stock > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(item.stock === 0)
        )
      );
    }
  }

  if (pageCount > 1) {
    container.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`festival_shop:page:${page - 1}`)
          .setLabel("Previous")
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId(`festival_shop:page:${page + 1}`)
          .setLabel("Next")
          .setEmoji("▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === pageCount - 1)
      )
    );
  }

  if (canManage) {
    container
      .addSeparatorComponents((separator) =>
        separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("festival_shop:add")
            .setLabel("Add Festival Shop Item")
            .setEmoji("➕")
            .setStyle(ButtonStyle.Primary)
        )
      );
  }

  return [container];
}

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("shop")
    .setDescription("View the festival shop"),

  async execute(interaction) {
    const items = await interaction.client.modules.database.getFestivalShopItems();
    const user = await interaction.client.modules.database.getFestivalUser(interaction.user.id);
    return interaction.reply({
      components: festivalShopComponents(
        items,
        interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID),
        user?.score ?? 0
      ),
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
  festivalShopComponents,
};
