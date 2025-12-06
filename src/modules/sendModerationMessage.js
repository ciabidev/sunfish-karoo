// send a moderation message embed to the channel the command was used in

const { ContainerBuilder, MessageFlags } = require("discord.js");
const { getLatestCase } = require("./supabase");

module.exports = async function sendModerationMessage({
  targetUser, // user object
  action, // string
  reason = "No reason provided",
  actionedBy, // user object
  interaction, // interaction object
  durationMs = null, 
  pointsDelta = null, 
}) {
  const caseData = await getLatestCase(targetUser.id);
  if (!caseData) {
    console.log("No case data found");
  }
  const currentCaseId = caseData.id;
  
  const formattedDuration = interaction.client.modules.formatMilliseconds(durationMs);
  const mainText = new ContainerBuilder()
    .addTextDisplayComponents(
      (t) => t.setContent(`### ${action} | case #${currentCaseId}`),
      (t) => t.setContent(`${action} to <@${targetUser.id}> (${targetUser.id}) by <@${actionedBy.id}> (${actionedBy.id})\n`),
      (t) => t.setContent(`**Reason: **${reason ? reason : "No reason provided"}\n`),
      ...(durationMs ? [(t) => t.setContent(`**Duration: **${formattedDuration}\n`)] : [])
    )

    .addSeparatorComponents((separator) => separator)

    .addTextDisplayComponents(
      ...(pointsDelta
        ? [
            (t) =>
              t.setContent(`-# **Point Change:** ${pointsDelta > 0 ? "+" : ""}${pointsDelta}\n`),
          ]
        : [])
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
