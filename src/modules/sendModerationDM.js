

const { ContainerBuilder, MessageFlags } = require("discord.js");

module.exports = async function sendModerationDM({
  targetUser,
  action,
  reason = "No reason provided",
  durationMs = null,
  interaction,
  actionedBy = interaction.user,
  pointsDelta = null,
}) {
  let description = `
**Server:** ${interaction.guild.name}
**Action:** ${action}
**Actioned By:** <@${actionedBy.id}>
**Reason:** ${reason ? reason : "No reason provided"}
`;

if (durationMs) {
  description += `**Duration:** ${interaction.client.modules.formatMilliseconds(durationMs)}\n`;
}

if (pointsDelta) {
  description += `**Point Change:** ${pointsDelta > 0 ? "+" : ""}${pointsDelta}\n`;
}

const mainText = new ContainerBuilder()
  .addTextDisplayComponents(
    (t) => t.setContent(`### You (probably) broke a rule in ${interaction.guild.name}`))
  .addTextDisplayComponents(
    (t) => t.setContent(`A moderation action was applied... ${description}`)
  )


  const components = [mainText];

  if (interaction) {
    try {
      await targetUser.send({
        components,
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      console.error(`Failed to DM ${targetUser.id}:`, err);
    }
  }
};
