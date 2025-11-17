// send a moderation message embed to the channel the command was used in

const e = require("express");

module.exports = async function sendModerationMessage({
  targetUser,
  interaction,
  action,
  reason = "No reason provided",
  duration = null,
}) {
  const fields = [
    { name: "Action", value: `${action} to <@${targetUser.id}>`, inline: false },
    { name: "Reason", value: reason, inline: false },
  ];

  if (duration) {
    fields.push({ name: "Duration", value: duration, inline: false });
  }

  embed = {
    title: ``,
    description: "a moderation action was applied...",
    fields,
    color: 0xff0000,
  };
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ embeds: [embed] });
  } else {
    await interaction.reply({ embeds: [embed] });
  }
};
