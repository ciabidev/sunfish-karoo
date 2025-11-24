const { createClient } = require("@supabase/supabase-js");
const {supabase_url, supabase_service_key} = require("../../config.json"); // adjust path if needed


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
module.exports = {
  getUserPoints,
  createCase,
  getCases,
  getLatestCase,
};