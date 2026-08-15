const { PermissionsBitField, ChannelType, MessageFlags, SlashCommandSubcommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("verifylog")
    .setDescription("Approve, deny, or remove a point from a festival log")
    .addStringOption((option) =>
      option.setName("type").setDescription("Approve, deny, or remove a point").setRequired(false).addChoices(
        { name: "Approve", value: "approve" },
        { name: "Deny", value: "deny" },
        { name: "Remove point", value: "removepoint" }
      )
    ),
  execute: async (interaction) => {
    const FESTIVAL_MANAGER_ROLE_ID = process.env.FESTIVAL_MANAGER_ROLE_ID;
    const FESTIVAL_CHANNEL_ID = process.env.FESTIVAL_CHANNEL_ID;
    const APPROVED_TAG_ID = process.env.FESTIVAL_APPROVED_TAG_ID;
    const DENIED_TAG_ID = process.env.FESTIVAL_DENIED_TAG_ID;
    if (!interaction.member.roles.cache.has(FESTIVAL_MANAGER_ROLE_ID)) {
      return await interaction.reply({
        content: "You do not have permission to approve festival logs.",
        flags: MessageFlags.Ephemeral,
      });
    }


    const post = interaction.channel;
    if (!post.parentId || post.parentId !== FESTIVAL_CHANNEL_ID) {
      return await interaction.reply({
        content: "You can only verify festival logs in a festival post",
        flags: MessageFlags.Ephemeral,
      });
    }
    const postId = interaction.channelId;
    let targetUserId = post.ownerId;
    // If the post was created by Karoo (bot), look up the actual host from the database
    if (post.ownerId === interaction.client.user.id) {
      const hostId = await interaction.client.modules.database.getPartyHost(postId);
      if (hostId) targetUserId = hostId;
    }
    try {
      const appliedTagIds = post.appliedTags.map((tag) => tag.id);
      const isApproved = appliedTagIds.includes(APPROVED_TAG_ID) && !appliedTagIds.includes(DENIED_TAG_ID);
      const type = interaction.options.getString("type") ?? (isApproved ? "approve" : "deny");
      
      let data = await interaction.client.modules.database.updateFestivalScore(targetUserId, postId, type);
    
      if (data === "Already approved/denied") {
        await interaction.reply({
          content: `This festival log has already been verified.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (type === "approve") {
        await post.setAppliedTags([APPROVED_TAG_ID]);
      } else if (type === "deny") {
        await post.setAppliedTags([DENIED_TAG_ID]);
      } else {
        await post.setAppliedTags([DENIED_TAG_ID]);
      }

      await interaction.reply({
        content: type === "approve"
          ? `✅ Approved festival log for <@${targetUserId}> and added 1 point.`
          : type === "deny"
            ? `❌ Denied festival log for <@${targetUserId}>.`
            : `Removed 1 festival point from <@${targetUserId}>.`,
      });

      try {
        await interaction.client.modules.database.updatePartyLogStatus(
          postId,
          type === "removepoint" ? "deny" : type
        );
      } catch (error) {
        console.error("Failed to update party log status:", error);
      }
    } catch (error) {
      console.error("Error approving festival log:", error);
      await interaction.reply({
        content: "Failed to approve festival log.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
