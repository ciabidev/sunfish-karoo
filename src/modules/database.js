const mongoose = require("mongoose");

const databaseName =
  process.env.MONGODB_DATABASE || (process.env.DEV_MODE === "true" ? "development" : "production");

const festivalScoreSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, unique: true },
    score: { type: Number, required: true, default: 0 },
    post_ids: { type: [String], default: [] },
  },
  { collection: "festival_scores", versionKey: false }
);

const FestivalScore =
  mongoose.models.FestivalScore || mongoose.model("FestivalScore", festivalScoreSchema);

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: databaseName });
    await FestivalScore.init();
  }
}

async function updateFestivalScore(userId, postId, type, retry = true) {
  const user = String(userId);
  const post = String(postId);
  const delta = type === "approve" || type === "add" ? 1 : 0;

  try {
    const previous = await FestivalScore.findOneAndUpdate(
      { user },
      [
        {
          $set: {
            user,
            score: {
              $cond: [
                { $in: [post, { $ifNull: ["$post_ids", []] }] },
                { $ifNull: ["$score", 0] },
                { $add: [{ $ifNull: ["$score", 0] }, delta] },
              ],
            },
            post_ids: { $setUnion: [{ $ifNull: ["$post_ids", []] }, [post]] },
          },
        },
      ],
      { upsert: true, new: false, lean: true }
    );

    if (previous?.post_ids?.includes(post)) return "Already approved/denied";

    return FestivalScore.findOne({ user }).select("-_id user score post_ids").lean();
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

async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = {
  connectDatabase,
  updateFestivalScore,
  getFestivalTop,
  getFestivalUser,
  getFestivalRank,
  closeDatabase,
};
