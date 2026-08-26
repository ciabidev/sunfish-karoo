const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = function festivalShopBuyModal(item) {
  return new ModalBuilder()
    .setCustomId(`festival_shop:buy_many:${item._id}`)
    .setTitle(`Buy ${item.name}`.slice(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("quantity")
          .setLabel(`Quantity (current stock: ${item.stock})`)
          .setPlaceholder("Enter how many you want to buy")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(6)
          .setRequired(true)
      )
    );
};
