// express health check

const express = require("express");
const app = express();

// This route just confirms the bot is online
app.get("/", (req, res) => {
  res.send("✅ Sunfish-Karoo is alive!");
});

// Render automatically assigns a port in process.env.PORT
const server = app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Express keep-alive server running.");
});

// INDEX.JS COPY PASTE TEMPLATE

// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

require('dotenv').config();

const devMode = process.env.DEV_MODE === "true";
const devToken = process.env.DEV_TOKEN;
const productionToken = process.env.PRODUCTION_TOKEN;


const token = devMode === true ? devToken : productionToken;

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// Log in to Discord with your client's token
client.commands = new Collection(); 
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    command.__path = filePath; // this is needed for reloading commands
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

// load other files

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) { 
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}  

const modulesPath = path.join(__dirname, "src/modules");
const moduleFiles = fs.readdirSync(modulesPath).filter((file) => file.endsWith(".js"));

client.modules = {};

for (const file of moduleFiles) {
  const filePath = path.join(modulesPath, file);

  try {
    const imported = require(filePath);
    const name = file.replace(".js", "");

    if (typeof imported === "function" && imported.length === 0) {
      imported(client);
      console.log(`[MODULE] Loaded boot: ${file}`);
      continue;
    }

    client.modules[name] = imported;
    console.log(`[MODULE] Loaded utility: ${file}`);
  } catch (err) {
    console.error(`[MODULE] Failed to load ${file}:`, err);
  }
}

async function start() {
  await client.modules.database.connectDatabase();
  console.log("[DATABASE] Connected to MongoDB.");
  await client.login(token);
}

async function shutdown() {
  server.close();
  client.destroy();
  await client.modules.database.closeDatabase();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

start().catch((error) => {
  console.error("Failed to start:", error);
  process.exitCode = 1;
  void shutdown();
});
