const { ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags, ModalBuilder, ActionRowBuilder, TextInputBuilder, LabelBuilder, FileUploadBuilder } = require("discord.js");

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

    // verify it's from Sailor's Lodge
    const sailorsLodgeId = process.env.SAILORS_LODGE_ID;
    if (!sailorsLodgeId || targetMessage.author.id !== sailorsLodgeId) {
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

    // verify the user right-clicking is mentioned in the message (they are the host)
    const mentionRegex = new RegExp(`<@!?${interaction.user.id}>`);
    if (!mentionRegex.test(targetMessage.content)) {
      await interaction.reply({
        content: "You can only log your own party.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // get duration from ping timestamp to now
    const startTime = new Date(targetMessage.createdAt);
    const endTime = new Date();
    const durationMinutes = (endTime - startTime) / 1000 / 60;

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
};
