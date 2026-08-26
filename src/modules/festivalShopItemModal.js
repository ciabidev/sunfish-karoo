const {
  ActionRowBuilder,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = function festivalShopItemModal(item) {
  const modal = new ModalBuilder()
    .setCustomId(`festival_shop:save:${item?._id ?? "new"}`)
    .setTitle(item ? "Edit Festival Shop Item" : "Add Festival Shop Item");

  const nameInput = new TextInputBuilder()
    .setCustomId("name")
    .setLabel("Name")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(80)
    .setRequired(true);
  const descriptionInput = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Description")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);
  const priceInput = new TextInputBuilder()
    .setCustomId("price")
    .setLabel("Point value")
    .setPlaceholder("100")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(6)
    .setRequired(true);
  const stockInput = new TextInputBuilder()
    .setCustomId("stock")
    .setLabel("Stock")
    .setPlaceholder("10")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(6)
    .setRequired(true);
  const imageUpload = new FileUploadBuilder()
    .setCustomId("image")
    .setMinValues(item ? 0 : 1)
    .setMaxValues(1)
    .setRequired(!item);
  const imageLabel = new LabelBuilder()
    .setLabel("Item Image")
    .setDescription(
      item ? "Leave empty to keep the current image." : "Upload one image for the shop item thumbnail."
    )
    .setFileUploadComponent(imageUpload);

  if (item) {
    nameInput.setValue(item.name);
    descriptionInput.setValue(item.description);
    priceInput.setValue(String(item.price));
    stockInput.setValue(String(item.stock));
  }

  return modal
    .addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(priceInput),
      new ActionRowBuilder().addComponents(stockInput)
    )
    .addLabelComponents(imageLabel);
};
