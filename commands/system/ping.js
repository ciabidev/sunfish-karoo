const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('ping').setDescription('check if Karoo is ok, also ping supabase'),
	async execute(interaction) {
		await interaction.reply('hi');
		await interaction.client.modules.supabase.getCases(0);
	},
};