// send a moderation message embed to the channel the command was used in

const { TextDisplayBuilder, SeparatorBuilder, ContainerBuilder, MessageFlags, SeparatorSpacingSize } = require("discord.js");
const { text } = require("express");
module.exports = async function sendModerationMessage({
  targetUser,
  action,
  reason = "No reason provided",
  actionedBy,
  interaction = null,
  formattedDuration = null,
  channel = null,
  addPoints = null,
  removePoints = null,
}) {
  const mainText = 
    new ContainerBuilder().addTextDisplayComponents(
      (t) => t.setContent(`## moderation action`),
      (t) => t.setContent(`${action} to <@${targetUser.id}> by <@${actionedBy.id}>`),
      (t) => t.setContent(`**Reason:**\n${reason ? reason : "No reason provided"}\n`),
      ...(formattedDuration ? [(t) => t.setContent(`**Duration:**\n${formattedDuration}\n`)] : [])

    )
    
    .addSeparatorComponents((seperator) => seperator)
    
    .addTextDisplayComponents(
      ...(addPoints ? [(t) => t.setContent(`-# **Points added:** ${addPoints}\n`)] : []),
      ...(removePoints ? [(t) => t.setContent(`-# **Points removed:** ${removePoints}\n`)] : [])
    );
    
  const components = [mainText];

  if (channel) {
    await channel.send({ components, flags: MessageFlags.IsComponentsV2 });
  } else if (interaction) {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ components, flags: MessageFlags.IsComponentsV2 });
    } else {
      await interaction.reply({ components, flags: MessageFlags.IsComponentsV2 });
    }
  } else {
    console.log("No channel or interaction provided");
  }
};
