const { ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags, ModalBuilder, ActionRowBuilder, TextInputBuilder, LabelBuilder, FileUploadBuilder } = require("discord.js");

function getSailorsLodgeHostId(message) {
  if (!process.env.SAILORS_LODGE_ID || message.author.id !== process.env.SAILORS_LODGE_ID) return null;

  const pingMatch = message.content.match(
    /^(?:<@&\d+>\s*)?\*\*[^*\r\n]+\*\*\s+ping\s+(?:triggered\s+by|from)\s+<@!?(\d+)>/i
  );
  return pingMatch?.[1] ?? null;
}

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("Log Party")
    .setType(ApplicationCommandType.Message)
    .setDMPermission(false),

  async execute(interaction) {
    const targetMessage = interaction.targetMessage;

    if (!targetMessage) {
      await interaction.reply({
        content: "Could not find the message to log.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const partyChannel = await interaction.client.modules.database.getFestivalPartyChannel(
      targetMessage.channelId
    );
    if (!partyChannel) {
      await interaction.reply({
        content: "Parties can only be logged from a configured festival party channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const hostId = getSailorsLodgeHostId(targetMessage);
    if (!hostId) {
      await interaction.reply({
        content: "This isn't a valid Sailor's Lodge party ping.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // check if already logged
    const isLogged = await interaction.client.modules.database.isPartyMessageLogged(targetMessage.id);
    if (isLogged) {
      await interaction.reply({
        content: "This party has already been logged.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (hostId !== interaction.user.id) {
      await interaction.reply({
        content: "You can only log your own party.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // show modal with Activity and Screenshot fields
    const modal = new ModalBuilder()
      .setCustomId(`party_log_modal:${targetMessage.channelId}:${targetMessage.id}`)
      .setTitle("Log Party");

    const activityField = new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("activity")
        .setLabel("Activity")
        .setPlaceholder("What did you do?")
        .setRequired(true)
        .setStyle(1), // Short Text
    );

    const screenshotUpload = new FileUploadBuilder()
      .setCustomId("screenshot")
      .setRequired(false)
      .setMaxValues(1)
      .setMinValues(0);

    const screenshotLabel = new LabelBuilder()
      .setLabel("Screenshot (Optional)")
      .setFileUploadComponent(screenshotUpload);

    modal.addComponents(activityField).addLabelComponents(screenshotLabel);

    await interaction.showModal(modal);
  },
  getSailorsLodgeHostId,
};
