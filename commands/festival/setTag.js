const { MessageFlags, SlashCommandSubcommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("settag")
    .setDescription("Set the tag applied to all new festival posts")
    .addStringOption((option) =>
      option.setName("id").setDescription("Forum tag ID").setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(process.env.FESTIVAL_MANAGER_ROLE_ID)) {
      return interaction.reply({
        content: "You do not have permission to change the festival tag.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const tagId = interaction.options.getString("id", true).trim();
    const festivalForum = await interaction.client.channels.fetch(process.env.FESTIVAL_CHANNEL_ID);
    const tag = festivalForum?.availableTags?.find((availableTag) => availableTag.id === tagId);

    if (!tag) {
      return interaction.reply({
        content: "I couldn't find that tag in the festival forum.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.client.modules.database.setFestivalDefaultTag(tagId);
    return interaction.reply({
      content: `Got it — **${tag.name}** will be applied to new festival posts.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
