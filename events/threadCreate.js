const { Events } = require("discord.js");

module.exports = {
  name: Events.ThreadCreate,

  async execute(thread) {
    if (thread.parentId !== process.env.FESTIVAL_CHANNEL_ID) return;

    try {
      const tagId = await thread.client.modules.database.getFestivalDefaultTag();
      if (!tagId || thread.appliedTags.includes(tagId)) return;

      const tagExists = thread.parent?.availableTags?.some((tag) => tag.id === tagId);
      if (!tagExists) {
        console.error(`[FESTIVAL] Configured default tag ${tagId} no longer exists.`);
        return;
      }

      await thread.setAppliedTags([...thread.appliedTags, tagId]);
    } catch (error) {
      console.error("[FESTIVAL] Failed to apply the default tag:", error);
    }
  },
};
