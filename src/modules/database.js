const mongoose = require("mongoose");

const databaseName =
  process.env.MONGODB_DATABASE || (process.env.DEV_MODE === "true" ? "development" : "production");

const festivalScoreSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, unique: true },
    score: { type: Number, required: true, default: 0 },
    message_ids: { type: [String], default: [] },
  },
  { collection: "festival_scores", versionKey: false }
);

const FestivalScore =
  mongoose.models.FestivalScore || mongoose.model("FestivalScore", festivalScoreSchema);

const partyLogSchema = new mongoose.Schema(
  {
    threadId: { type: String, required: true, unique: true },
    hostId: { type: String, required: true },
    pingMessageId: { type: String, required: true, unique: true },
    status: { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
  },
  { collection: "party_logs", timestamps: true }
);

const PartyLog =
  mongoose.models.PartyLog || mongoose.model("PartyLog", partyLogSchema);

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: databaseName });
    await FestivalScore.init();
    await PartyLog.init();
  }
}

async function updateFestivalScore(userId, postId, type, retry = true) {
  const user = String(userId);
  const post = String(postId);
  const delta = type === "approve" || type === "add" ? 1 : 0;
  const removePoint = type === "removepoint" || type === "remove";

  try {
    const previous = await FestivalScore.findOneAndUpdate(
      { user },
      [
        {
          $set: {
            user,
            score: {
              $cond: [
                { $in: [post, { $ifNull: ["$message_ids", []] }] },
                removePoint
                  ? { $max: [0, { $subtract: [{ $ifNull: ["$score", 0] }, 1] }] }
                  : { $ifNull: ["$score", 0] },
                { $add: [{ $ifNull: ["$score", 0] }, delta] },
              ],
            },
            message_ids: removePoint
              ? { $setDifference: [{ $ifNull: ["$message_ids", []] }, [post]] }
              : delta === 1
                ? { $setUnion: [{ $ifNull: ["$message_ids", []] }, [post]] }
                : { $ifNull: ["$message_ids", []] },
          },
        },
      ],
      { upsert: true, new: false, lean: true, updatePipeline: true }
    );

    const wasPreviouslyHandled = previous?.message_ids?.includes(post) ?? false;
    if ((!removePoint && wasPreviouslyHandled) || (removePoint && !wasPreviouslyHandled)) {
      return "Already approved/denied";
    }

    return FestivalScore.findOne({ user }).select("-_id user score message_ids").lean();
  } catch (error) {
    if (retry && error.code === 11000) {
      return updateFestivalScore(user, post, type, false);
    }
    throw error;
  }
}

async function getFestivalTop(limit = 10) {
  return FestivalScore.find()
    .select("-_id user score")
    .sort({ score: -1, user: 1 })
    .limit(limit)
    .lean();
}

async function getFestivalUser(userId) {
  return FestivalScore.findOne({ user: String(userId) }).select("-_id user score").lean();
}

async function getFestivalRank(_userId, userScore) {
  return (await FestivalScore.countDocuments({ score: { $gt: userScore } })) + 1;
}

/**
 * Check if a party message has already been logged
 * @param {string} messageId - The ID of the Sailor's Lodge ping message
 * @returns {Promise<boolean>} True if already logged, false otherwise
 */
async function isPartyMessageLogged(messageId) {
  return await PartyLog.findOne({ pingMessageId: String(messageId) }) !== null;
}

/**
 * Record a party log entry mapping a forum thread to its host and source ping
 * @param {string} hostId - Discord user ID of the party host
 * @param {string} threadId - The forum thread/channel ID created by Karoo
 * @param {string} pingMessageId - The Sailor's Lodge party ping message ID
 * @returns {Promise<void>}
 */
async function addPartyLog(hostId, threadId, pingMessageId, status = "pending") {
  await PartyLog.create({
    hostId: String(hostId),
    threadId: String(threadId),
    pingMessageId: String(pingMessageId),
    status,
  });
}

/**
 * Update the verification status of a party log
 * @param {string} threadId - The forum thread/channel ID
 * @param {string} status - "approve" or "deny"
 * @returns {Promise<void>}
 */
async function updatePartyLogStatus(threadId, status) {
  const normalized = status === "approve" ? "approved" : "denied";
  await PartyLog.updateOne({ threadId: String(threadId) }, { status: normalized });
}

/**
 * Get the host user ID who created a party log post
 * @param {string} threadId - The forum thread/post ID
 * @returns {Promise<string|null>} Host user ID, or null if not found
 */
async function getPartyHost(threadId) {
  const entry = await PartyLog.findOne({ threadId: String(threadId) }).select("hostId -_id").lean();
  return entry?.hostId || null;
}

async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = {
  connectDatabase,
  updateFestivalScore,
  getFestivalTop,
  getFestivalUser,
  getFestivalRank,
  isPartyMessageLogged,
  addPartyLog,
  updatePartyLogStatus,
  closeDatabase,
  getPartyHost,
};
