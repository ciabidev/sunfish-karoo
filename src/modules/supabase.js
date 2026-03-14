const { createClient } = require("@supabase/supabase-js");
const { MessageFlags } = require("discord.js");
require("dotenv").config();

const supabase_url = process.env.SUPABASE_URL;
const supabase_service_key = process.env.SUPABASE_SERVICE_KEY;

if (!supabase_url || !supabase_service_key) {
  throw new Error("Supabase config missing in config.json");
}

const supabase = createClient(supabase_url, supabase_service_key);

module.exports = supabase;

(async () => {
  const { data, error } = await supabase.from("moderation_cases").select("*").limit(1);

  if (error) {
    console.error("Supabase error:", error);
    return;
  }

  console.log("Supabase response:", data);
})();

// example document 
/*
Supabase response: [
  {
    id: 1,
    target_user: 1370525449775612000,
    action: 'see',
    reason: 'see',
    actioned_by: 1370525449775612000,
    duration_ms: null,
    formatted_duration: null,
    points_delta: null,
    created_at: '2025-11-22T01:28:00.779377+00:00'
  }
]
*/

async function getUserPoints(userId) {
  const { data, error } = await supabase.rpc("sum_points_for_user", {
    _target_user: userId,
  });
  if (error) {
    console.error("RPC error", error);
  } else {
    const totalPoints = data;
    return totalPoints;
  }
}

async function createCase(entry) {
  const { data, error } = await supabase.from("moderation_cases").insert(entry).select().single();

  if (error) {
    console.error("Supabase createCase error:", error);
    return null;
  }

  return data;
}

async function getCases(userId) {
  const { data, error } = await supabase
    .from("moderation_cases")
    .select("*")
    .eq("target_user", userId);

  if (error) {
    console.error("Supabase getCases error:", error);
    return [];
  }

  return data.sort((a, b) => b.id - a.id); // newest first
}

async function getLatestCase(userId) {
  const { data, error } = await supabase
    .from("moderation_cases")
    .select("*")
    .eq("target_user", userId)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) {
    console.error("Supabase getLatestCase error:", error);
    return null;
  }

  return data[0];
}

async function updateFestivalScore(userId, postId, type) {
  const { data: existing, error: selectError } = await supabase
    .from("festival_scores")
    .select("score, post_ids")
    .eq("user", userId)
    .single();
  
  // check if the postId was already approved/denied. if so, dont add or remove anything and return "Already approved/denied"\

  if (existing && existing.post_ids.includes(postId)) {
    return "Already approved/denied";
  }
  const delta = type === "approve" ? 1 : 0;

  if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is not found
    console.error("Supabase updateFestivalScore select error:", selectError);
    return null;
  }

  if (existing) {
    // Update existing
    const newScore = existing.score + delta;
    const newPostIds = [...existing.post_ids, postId];
    const { data, error } = await supabase
      .from("festival_scores")
      .update({ score: newScore, post_ids: newPostIds })
      .eq("user", userId)
      .select()
      .single();

    if (error) {
      console.error("Supabase updateFestivalScore update error:", error);
      return null;
    }
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from("festival_scores")
      .insert({ user: userId, score: delta, post_ids: [postId] })
      .select()
      .single();

    if (error) {
      console.error("Supabase updateFestivalScore insert error:", error);
      return null;
    }
    return data;
  }
}

async function getFestivalTop(limit = 10) {
  const { data, error } = await supabase
    .from("festival_scores")
    .select("user, score")
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Supabase getFestivalTop error:", error);
    return [];
  }

  return data ?? [];
}

async function getFestivalUser(userId) {
  const { data, error } = await supabase
    .from("festival_scores")
    .select("user, score")
    .eq("user", userId)
    .maybeSingle();

  if (error) {
    console.error("Supabase getFestivalUser error:", error);
    return null;
  }

  return data ?? null;
}

async function getFestivalRank(userId, userScore) {
  const { count, error } = await supabase
    .from("festival_scores")
    .select("user", { count: "exact", head: true })
    .gt("score", userScore);

  if (error) {
    console.error("Supabase getFestivalRank error:", error);
    return null;
  }

  return (count ?? 0) + 1;
}

module.exports = {
  getUserPoints,
  createCase,
  getCases,
  getLatestCase,
  updateFestivalScore,
  getFestivalTop,
  getFestivalUser,
  getFestivalRank,
};
