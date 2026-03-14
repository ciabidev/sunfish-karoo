const { PermissionsBitField, ChannelType, MessageFlags, SlashCommandSubcommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("verifylog")
    .setDescription("Approve or deny a festival log")
    .addStringOption((option) =>
      option.setName("type").setDescription("Approve or deny").setRequired(false).addChoices({ name: "Approve", value: "approve" }, { name: "Deny", value: "deny" })
    ),
  execute: async (interaction) => {
    const FESTIVAL_MANAGER_ROLE_ID = process.env.FESTIVAL_MANAGER_ROLE_ID;
    const FESTIVAL_CHANNEL_ID = process.env.FESTIVAL_LOG_CHANNEL_ID;
    const APPROVED_TAG_ID = process.env.FESTIVAL_APPROVED_TAG_ID;
    const DENIED_TAG_ID = process.env.FESTIVAL_DENIED_TAG_ID;
    if (!interaction.member.roles.cache.has(FESTIVAL_MANAGER_ROLE_ID)) {
      return await interaction.reply({
        content: "You do not have permission to approve festival logs.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const post = interaction.channel;
    if (!post.parent.id === FESTIVAL_CHANNEL_ID) {
      return await interaction.reply({
        content: "You can only verify festival logs in a festival post",
        flags: MessageFlags.Ephemeral,
      });
    }
    const postId = interaction.channelId;
    const targetUserId = post.ownerId;
    
    try {
      const appliedTagIds = post.appliedTags.map((tag) => tag.id);
      const isApproved = appliedTagIds.includes(APPROVED_TAG_ID) && !appliedTagIds.includes(DENIED_TAG_ID);
      const type = interaction.options.getString("type") ?? isApproved ? "approve" : "deny";
      
      let data = await interaction.client.modules.supabase.updateFestivalScore(targetUserId, postId, type);
    
      if (data === "Already approved/denied") {
        await interaction.reply({
          content: `This festival log has already been verified.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (type === "approve") {
        await post.setAppliedTags([APPROVED_TAG_ID]);
      } else {
        await post.setAppliedTags([DENIED_TAG_ID]);
      }

      await interaction.reply({
        content: `${type == "approve" ? "✅ Approved" : "❌ Denied"} festival log for <@${targetUserId}> ${type === "approve" ? "and added 1 point." : ""}`,
      });
    } catch (error) {
      console.error("Error approving festival log:", error);
      await interaction.reply({
        content: "Failed to approve festival log.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
