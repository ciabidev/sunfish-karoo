const { createClient } = require("@supabase/supabase-js");
const {supabase_url, supabase_service_key} = require("./config.json"); // adjust path if needed


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