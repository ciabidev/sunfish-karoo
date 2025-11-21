

module.exports = async function sendModerationDM({
  targetUser,
  guild,
  action,
  reason = "No reason provided",
  formattedDuration = null,
  actionedBy,
  addPoints = null,
  removePoints = null,
}) {
  const fields = [
    { name: "Action", value: action, inline: false },
    { name: "Reason", value: reason, inline: false },
    { name: "Actioned By", value: `<@${actionedBy.id}>`, inline: false },
    { name: "Server", value: guild.name, inline: false },
  ];

  if (formattedDuration) {
    fields.push({ name: "Duration", value: formattedDuration, inline: false });
  }

  if (addPoints) {
    fields.push({ name: "Points Added", value: addPoints, inline: false });
  }

  if (removePoints) {
    fields.push({ name: "Points Removed", value: removePoints, inline: false });
  }

  try {
    await targetUser.send({
      embeds: [
        {
          title: `You (probably) broke a rule in ${guild.name}`,
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
