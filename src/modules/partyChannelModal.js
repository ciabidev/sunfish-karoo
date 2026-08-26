const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = function partyChannelModal(channel) {
  const modal = new ModalBuilder()
    .setCustomId(`festival_party_channels:save:${channel?.channelId ?? "new"}`)
    .setTitle(channel ? "Edit Party Channel" : "Add Party Channel");

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId("channel")
    .setPlaceholder("Select a party channel")
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    .setMinValues(1)
    .setMaxValues(1)
    .setRequired(true);
  const channelLabel = new LabelBuilder()
    .setLabel("Party Channel")
    .setChannelSelectMenuComponent(channelSelect);
  const pointsInput = new TextInputBuilder()
    .setCustomId("points")
    .setLabel("Points per log")
    .setPlaceholder("1")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(6)
    .setRequired(true);

  if (channel) {
    channelSelect.setDefaultChannels(channel.channelId);
    pointsInput.setValue(String(channel.points));
  }

  return modal
    .addLabelComponents(channelLabel)
    .addComponents(new ActionRowBuilder().addComponents(pointsInput));
};
