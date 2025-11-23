

module.exports = async function sendModerationDM({
  targetUser,
  action,
  reason = "No reason provided",
  durationMs = null,
  interaction,
  actionedBy = interaction.user,
  pointsDelta = null,
}) {
  const fields = [
    { name: "Action", value: action, inline: false },
    { name: "Reason", value: reason ? reason : "No reason provided", inline: false },
    { name: "Actioned By", value: `<@${actionedBy.id}>`, inline: false },
    { name: "Server", value: interaction.guild.name, inline: false },
  ];

  if (durationMs) {
    fields.push({ name: "Duration", value: interaction.client.modules.formatMilliseconds(durationMs), inline: false });
  }

  if (pointsDelta) {
    fields.push({ name: "Point Change", value: `${pointsDelta > 0 ? "+" : ""}${pointsDelta}`, inline: false });
  }

  try {
    await targetUser.send({
      embeds: [
        {
          title: `You (probably) broke a rule in ${interaction.guild.name}`,
          description: "a moderation action was applied...",
          fields,
          color: 0xff0000,
        },
      ],
    });
  } catch (err) {
    console.error(`Failed to DM ${targetUser.id}:`, err);
  }
};
