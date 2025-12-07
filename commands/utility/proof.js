const {
  SlashCommandBuilder,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("proof")
    .setDescription("generate a service proof")
    .addStringOption((option) =>
      option.setName("name").setDescription("the name of the service").setRequired(true)
    )
    .addUserOption((option) =>
      option.setName("customer").setDescription("the customer's discord username").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("price").setDescription("the price they paid you").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("request").setDescription("what they wanted you to do").setRequired(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName("media")
        .setDescription("image or video proof that you began (depends) and completed the task")
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName("media2")
        .setDescription("image or video proof that you began (depends) and completed the task")
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName("media3")
        .setDescription("image or video proof that you began (depends) and completed the task")
        .setRequired(false)
    ),
  execute: async (interaction) => {
    const customer = interaction.options.getUser("customer");
    const price = interaction.options.getString("price");
    const request = interaction.options.getString("request");
    const media = [
      interaction.options.getAttachment("media") ?? null,
      interaction.options.getAttachment("media2") ?? null,
      interaction.options.getAttachment("media3") ?? null,
    ].filter((m) => m !== null);
    const name = interaction.options.getString("name");
    const mainText = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `## <@${interaction.user.id}> - ${name}\n**Helper:** <@${interaction.user.id}>\n**Customer:** <@${customer.id}>\n**Price:** ${price}\n**Request:** ${request}\n`
      )
    );

    if (media.length > 0) {
      mainText.addMediaGalleryComponents((gallery) => {
        return gallery.addItems(
          ...media.map((attachment) => (item) => item.setURL(attachment.url))
        );
      });
    }

    let response;
    response = await interaction.deferReply();

    mainText
      .addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents((t) => t.setContent(`-# **ID:** ${response.id}`));

    const components = [mainText];

    response = await interaction.editReply({
      components,
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
