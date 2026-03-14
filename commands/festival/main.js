const {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
  Collection,
} = require("discord.js");

const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  data: (() => {
    const builder = new SlashCommandBuilder()
      .setName("festival")
      .setDescription("Utility commands for the Harbor Festival");

    const dir = __dirname; // commands/moderation
    const files = fs
      .readdirSync(dir)
      .filter((f) => f !== "main.js" && f.endsWith(".js"));

    for (const file of files) {
      const sub = require(path.join(dir, file));
      builder.addSubcommand(() => sub.data);
    }

    return builder;
  })(),

  async execute(interaction) {
    const name = interaction.options.getSubcommand(true);
    const files = fs
      .readdirSync(__dirname)
      .filter((f) => f !== "main.js" && f.endsWith(".js"));
    const handlers = new Map();

    for (const file of files) {
      const sub = require(path.join(__dirname, file));
      if (sub?.data?.name) {
        handlers.set(sub.data.name, sub);
      }
    }

    const handler = handlers.get(name);
    if (!handler) {
      return interaction.reply({
        content: `Unknown subcommand: ${name}`,
        flags: MessageFlags.Ephemeral,
      });
    }
    return handler.execute(interaction);
  },
};
