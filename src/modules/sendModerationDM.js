
module.exports = async function sendModerationDM({
  targetUser,
  guild,
  action,
  reason = "No reason provided",
  duration = null,
  actionedBy,
}) {
  const fields = [
    { name: "Action", value: action, inline: false },
    { name: "Reason", value: reason, inline: false },
    { name: "Actioned By", value: `<@${actionedBy.id}>`, inline: false },
    { name: "Server", value: guild.name, inline: false },
  ];

  if (duration) {
    fields.push({ name: "Duration", value: duration, inline: false });
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
