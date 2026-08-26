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
    const PENDING_TAG_ID = process.env.FESTIVAL_PENDING_TAG_ID;
    if (!interaction.member.roles.cache.has(FESTIVAL_MANAGER_ROLE_ID)) {
      return await interaction.reply({
        content: "You do not have permission to approve festival logs.",
        flags: MessageFlags.Ephemeral,
      });
    }


    const post = interaction.channel;
    if (!post.parentId || post.parentId !== FESTIVAL_CHANNEL_ID) {
      return await interaction.reply({
        content: "This isn't a festival log",
        flags: MessageFlags.Ephemeral,
      });
    }
    const postId = interaction.channelId;
    let targetUserId = post.ownerId;
    const hostId = await interaction.client.modules.database.getPartyHost(postId);
    if (hostId) targetUserId = hostId;

    try {
      const appliedTagIds = post.appliedTags.map((tag) => tag.id);
      const isApproved = appliedTagIds.includes(APPROVED_TAG_ID) && !appliedTagIds.includes(DENIED_TAG_ID);
      const type = interaction.options.getString("type") ?? "approve";
      const partyLog = await interaction.client.modules.database.getPartyLog(postId);
      const points = partyLog?.points ?? 1;
      
      let data = await interaction.client.modules.database.updateFestivalScore(
        targetUserId,
        postId,
        type,
        points
      );
    
      if (data === "Already approved/denied") {
        await interaction.reply({
          content: `This festival log has already been verified.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (type === "approve") {
        const currentTags = post.appliedTags.filter(
          (tag) => tag !== PENDING_TAG_ID && tag !== DENIED_TAG_ID
        );
        if (!currentTags.includes(APPROVED_TAG_ID)) {
          currentTags.push(APPROVED_TAG_ID);
        }
        await post.setAppliedTags(currentTags);
      } else {
        const currentTags = post.appliedTags.filter(
          (tag) => tag !== PENDING_TAG_ID && tag !== APPROVED_TAG_ID
        );
        if (!currentTags.includes(DENIED_TAG_ID)) {
          currentTags.push(DENIED_TAG_ID);
        }
        await post.setAppliedTags(currentTags);
      }

      await interaction.reply({
        content: type === "approve"
          ? `✅ Approved festival log for <@${targetUserId}> and added ${points} ${points === 1 ? "point" : "points"}.`
          : type === "deny"
            ? `❌ Denied festival log for <@${targetUserId}>.`
            : `Removed ${points} festival ${points === 1 ? "point" : "points"} from <@${targetUserId}>.`,
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
