

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
  **Server:** ${interaction.guild.name} \n
  **Action:** ${action} \n
  **Actioned By:** <@${actionedBy.id}> \n
  **Reason:** ${reason ? reason : "No reason provided"} \n
  `;

  if (durationMs) {
    description += `**Duration:** ${interaction.client.modules.formatMilliseconds(durationMs)}\n`;
  }

  if (pointsDelta) {
    description += `**Point Change:** ${pointsDelta > 0 ? "+" : ""}${pointsDelta}\n`;
  }

  try {
    await targetUser.send({
      embeds: [
        {
          title: `You (probably) broke a rule in ${interaction.guild.name}`,
          description: `a moderation action was applied... \n ${description}`,
          color: 0xff0000,
        },
      ],
    });
  } catch (err) {
    console.error(`Failed to DM ${targetUser.id}:`, err);
  }
};
