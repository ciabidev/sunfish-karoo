// Make sure to run node deploy-commands.js in the same directory as your bot's source code!

const { REST, Routes, SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

require('dotenv').config();

const devMode = process.env.DEV_MODE === 'true';
const devToken = process.env.DEV_TOKEN;
const productionToken = process.env.PRODUCTION_TOKEN;
const productionClientId = process.env.PRODUCTION_CLIENT_ID;
const devClientId = process.env.DEV_CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = devMode === true ? devToken : productionToken;
const clientId = devMode === true ? devClientId : productionClientId;
const fs = require('node:fs');
const path = require('node:path');

const slashCommands = [];
const contextMenuCommands = [];

// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		
		if (command.data instanceof SlashCommandBuilder) {
			slashCommands.push(command.data.toJSON());
		} else if (command.data instanceof ContextMenuCommandBuilder) {
			contextMenuCommands.push(command.data.toJSON());
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${slashCommands.length} slash commands${contextMenuCommands.length > 0 ? ` and ${contextMenuCommands.length} context menu commands` : ''}.`);

		const allCommands = [...slashCommands, ...contextMenuCommands];
		const data = await rest.put(Routes.applicationCommands(clientId), { body: allCommands });

		console.log(`Successfully reloaded ${data.length} total application commands.`);
		
		for (const cmd of data) {
			if (cmd.type === ApplicationCommandType.ChatInput) {
				console.log(`  - /${cmd.name}`);
			} else if (cmd.type === ApplicationCommandType.Message) {
				console.log(`  - ${cmd.name} (Message Context)`);
			}
		}
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
