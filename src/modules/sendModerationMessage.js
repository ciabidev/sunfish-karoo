// send a moderation message embed to the channel the command was used in

const { ContainerBuilder, MessageFlags } = require("discord.js");
module.exports = async function sendModerationMessage({
  targetUser,
  action,
  reason = "No reason provided",
  actionedBy,
  interaction,
  durationMs = null,
  pointsDelta = null,
}) {

  console.log(targetUser.id);

  const formattedDuration = interaction.client.modules.formatMilliseconds(durationMs);
  const mainText = 
    new ContainerBuilder().addTextDisplayComponents(
      (t) => t.setContent(`## moderation action`),
      (t) => t.setContent(`${action} to <@${targetUser.id}> by <@${actionedBy.id}>`),
      (t) => t.setContent(`**Reason:**\n${reason ? reason : "No reason provided"}\n`),
      ...(durationMs ? [(t) => t.setContent(`**Duration:**\n${formattedDuration}\n`)] : [])

    )
    
    .addSeparatorComponents((seperator) => seperator)
    
    .addTextDisplayComponents(
      ...(pointsDelta ? [(t) => t.setContent(`-# **Point Change:** +${pointsDelta}\n`)] : []),
    );
    
  const components = [mainText];

  if (interaction) {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ components, flags: MessageFlags.IsComponentsV2 });
    } else {
      await interaction.reply({ components, flags: MessageFlags.IsComponentsV2 });
    }
  } else {
    console.log("No channel or interaction provided");
  }
};
