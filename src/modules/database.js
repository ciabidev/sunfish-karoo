const mongoose = require("mongoose");

const databaseName =
  process.env.MONGODB_DATABASE || (process.env.DEV_MODE === "true" ? "development" : "production");

const festivalScoreSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, unique: true },
    score: { type: Number, required: true, default: 0 },
    message_ids: { type: [String], default: [] },
    point_awards: {
      type: [{ message_id: { type: String, required: true }, points: { type: Number, required: true } }],
      default: [],
    },
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
    points: { type: Number, required: true, default: 1, min: 1 },
    status: { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
  },
  { collection: "party_logs", timestamps: true }
);

const PartyLog =
  mongoose.models.PartyLog || mongoose.model("PartyLog", partyLogSchema);

const festivalSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "festival" },
    defaultTagId: { type: String, default: null },
    partyChannels: {
      type: [{ channelId: { type: String, required: true }, points: { type: Number, required: true, min: 1 } }],
      default: [],
    },
  },
  { collection: "festival_settings", versionKey: false }
);

const FestivalSettings =
  mongoose.models.FestivalSettings || mongoose.model("FestivalSettings", festivalSettingsSchema);

const festivalShopItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 1 },
    stock: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },
  },
  { collection: "festival_shop_items", timestamps: true, versionKey: false }
);

const FestivalShopItem =
  mongoose.models.FestivalShopItem || mongoose.model("FestivalShopItem", festivalShopItemSchema);

const festivalPurchaseSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    itemName: { type: String, required: true },
    pointsPaid: { type: Number, required: true, min: 1 },
  },
  { collection: "festival_purchases", timestamps: true, versionKey: false }
);

const FestivalPurchase =
  mongoose.models.FestivalPurchase || mongoose.model("FestivalPurchase", festivalPurchaseSchema);

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: databaseName });
    await FestivalScore.init();
    await PartyLog.init();
    await FestivalSettings.init();
    await FestivalShopItem.init();
    await FestivalPurchase.init();
  }
}

async function updateFestivalScore(userId, postId, type, points = 1, retry = true) {
  const user = String(userId);
  const post = String(postId);
  const normalizedPoints = Math.max(1, Math.trunc(Number(points) || 1));
  const delta = type === "approve" || type === "add" ? normalizedPoints : 0;
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
                  ? {
                      $max: [
                        0,
                        {
                          $subtract: [
                            { $ifNull: ["$score", 0] },
                            {
                              $ifNull: [
                                {
                                  $getField: {
                                    field: "points",
                                    input: {
                                      $first: {
                                        $filter: {
                                          input: { $ifNull: ["$point_awards", []] },
                                          as: "award",
                                          cond: { $eq: ["$$award.message_id", post] },
                                        },
                                      },
                                    },
                                  },
                                },
                                1,
                              ],
                            },
                          ],
                        },
                      ],
                    }
                  : { $ifNull: ["$score", 0] },
                { $add: [{ $ifNull: ["$score", 0] }, delta] },
              ],
            },
            message_ids: removePoint
              ? { $setDifference: [{ $ifNull: ["$message_ids", []] }, [post]] }
              : delta > 0
                ? { $setUnion: [{ $ifNull: ["$message_ids", []] }, [post]] }
                : { $ifNull: ["$message_ids", []] },
            point_awards: removePoint
              ? {
                  $filter: {
                    input: { $ifNull: ["$point_awards", []] },
                    as: "award",
                    cond: { $ne: ["$$award.message_id", post] },
                  },
                }
              : delta > 0
                ? {
                    $cond: [
                      { $in: [post, { $ifNull: ["$message_ids", []] }] },
                      { $ifNull: ["$point_awards", []] },
                      {
                        $concatArrays: [
                          { $ifNull: ["$point_awards", []] },
                          [{ message_id: post, points: delta }],
                        ],
                      },
                    ],
                  }
                : { $ifNull: ["$point_awards", []] },
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
      return updateFestivalScore(user, post, type, normalizedPoints, false);
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
async function addPartyLog(hostId, threadId, pingMessageId, status = "pending", points = 1) {
  await PartyLog.create({
    hostId: String(hostId),
    threadId: String(threadId),
    pingMessageId: String(pingMessageId),
    status,
    points: Math.max(1, Math.trunc(Number(points) || 1)),
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

async function getPartyLog(threadId) {
  return PartyLog.findOne({ threadId: String(threadId) })
    .select("-_id hostId threadId pingMessageId status points")
    .lean();
}

async function setFestivalTag(tagId) {
  await FestivalSettings.updateOne(
    { key: "festival" },
    { $set: { defaultTagId: String(tagId) } },
    { upsert: true }
  );
}

async function getFestivalDefaultTag() {
  const settings = await FestivalSettings.findOne({ key: "festival" })
    .select("defaultTagId -_id")
    .lean();
  return settings?.defaultTagId ?? null;
}

async function getFestivalPartyChannels() {
  const settings = await FestivalSettings.findOneAndUpdate(
    { key: "festival" },
    [
      {
        $set: {
          key: "festival",
          defaultTagId: { $ifNull: ["$defaultTagId", null] },
          partyChannels: { $ifNull: ["$partyChannels", []] },
        },
      },
    ],
    { upsert: true, new: true, lean: true, updatePipeline: true }
  )
    .select("partyChannels -_id")
    .lean();
  return settings.partyChannels ?? [];
}

async function getFestivalPartyChannel(channelId) {
  const channel = String(channelId);
  const settings = await FestivalSettings.findOne(
    { key: "festival", "partyChannels.channelId": channel },
    { "partyChannels.$": 1, _id: 0 }
  ).lean();
  return settings?.partyChannels?.[0] ?? null;
}

async function setFestivalPartyChannel(channelId, points, previousChannelId = channelId) {
  const channel = String(channelId);
  const previousChannel = String(previousChannelId);
  const normalizedPoints = Math.max(1, Math.trunc(Number(points) || 1));
  await FestivalSettings.updateOne(
    { key: "festival" },
    [
      {
        $set: {
          key: "festival",
          defaultTagId: { $ifNull: ["$defaultTagId", null] },
          partyChannels: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ["$partyChannels", []] },
                  as: "partyChannel",
                  cond: {
                    $and: [
                      { $ne: ["$$partyChannel.channelId", channel] },
                      { $ne: ["$$partyChannel.channelId", previousChannel] },
                    ],
                  },
                },
              },
              [{ channelId: channel, points: normalizedPoints }],
            ],
          },
        },
      },
    ],
    { upsert: true, updatePipeline: true }
  );
}

async function removeFestivalPartyChannel(channelId) {
  await FestivalSettings.updateOne(
    { key: "festival" },
    { $pull: { partyChannels: { channelId: String(channelId) } } }
  );
}

async function getFestivalShopItems() {
  return FestivalShopItem.find()
    .select("name description price stock imageUrl")
    .sort({ createdAt: 1, _id: 1 })
    .lean();
}

async function getFestivalShopItem(itemId) {
  if (!mongoose.isObjectIdOrHexString(itemId)) return null;
  return FestivalShopItem.findById(itemId)
    .select("name description price stock imageUrl")
    .lean();
}

async function setFestivalShopItem(itemId, name, description, price, stock, imageUrl) {
  const item = {
    name: String(name),
    description: String(description),
    price: Math.trunc(Number(price)),
    stock: Math.trunc(Number(stock)),
    imageUrl: String(imageUrl),
  };

  if (itemId === "new") {
    return FestivalShopItem.create(item);
  }

  if (!mongoose.isObjectIdOrHexString(itemId)) return null;

  return FestivalShopItem.findByIdAndUpdate(itemId, { $set: item }, { new: true }).lean();
}

async function removeFestivalShopItem(itemId) {
  if (!mongoose.isObjectIdOrHexString(itemId)) return;
  await FestivalShopItem.findByIdAndDelete(itemId);
}

async function purchaseFestivalShopItem(userId, itemId) {
  if (!mongoose.isObjectIdOrHexString(itemId)) return { status: "unavailable" };
  const user = String(userId);
  let purchase;

  try {
    await mongoose.connection.transaction(async (session) => {
      const item = await FestivalShopItem.findOneAndUpdate(
        { _id: itemId, stock: { $gt: 0 } },
        { $inc: { stock: -1 } },
        { new: true, lean: true, session }
      );

      if (!item) {
        purchase = { status: "unavailable" };
        return;
      }

      const score = await FestivalScore.findOneAndUpdate(
        { user, score: { $gte: item.price } },
        { $inc: { score: -item.price } },
        { new: true, lean: true, session }
      );

      if (!score) {
        const error = new Error("Insufficient festival points");
        error.code = "INSUFFICIENT_FESTIVAL_POINTS";
        throw error;
      }

      await FestivalPurchase.create(
        [{ userId: user, itemId: item._id, itemName: item.name, pointsPaid: item.price }],
        { session }
      );
      purchase = {
        status: "purchased",
        itemName: item.name,
        pointsPaid: item.price,
        remainingPoints: score.score,
      };
    });
  } catch (error) {
    if (error.code === "INSUFFICIENT_FESTIVAL_POINTS") {
      return { status: "insufficient_points" };
    }
    throw error;
  }

  return purchase;
}

async function resetFestival() {
  await FestivalScore.deleteMany({});
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
  getPartyLog,
  setFestivalTag,
  getFestivalDefaultTag,
  getFestivalPartyChannels,
  getFestivalPartyChannel,
  setFestivalPartyChannel,
  removeFestivalPartyChannel,
  getFestivalShopItems,
  getFestivalShopItem,
  setFestivalShopItem,
  removeFestivalShopItem,
  purchaseFestivalShopItem,
  resetFestival
};
