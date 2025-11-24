const sendModerationDM = require("./sendModerationDm");
const sendModerationMessage = require("./sendModerationMessage");
const { createCase } = require("./supabase");

module.exports = async function recordModerationEvent({
  targetUser,
  interaction,
  action,
  reason = "No reason provided",
  actionedBy = interaction.user,
  durationMs = null,
  pointsDelta = null,
  notifyUser = true,
}) {
  const points_delta = pointsDelta

  await createCase({
    target_user: targetUser.id,
    action,
    reason,
    actioned_by: actionedBy.id,
    duration_ms: durationMs,
    points_delta,
  });

  if (notifyUser) {
    await sendModerationDM({
      targetUser,
      interaction,
      action,
      reason,
      durationMs,
      actionedBy,
      pointsDelta,
    });
  }

  await sendModerationMessage({
    targetUser,
    action,
    reason,
    actionedBy,
    durationMs,
    interaction,
    pointsDelta,
  });
  
}
