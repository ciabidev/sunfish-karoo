const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reopenpost')
        .setDescription('Reopen the current post'),
    async execute(interaction) {

        try {
            let thread = interaction.channel

            if (!thread.isThread()) {
            return await interaction.reply({
                content: "This command can only be used in a post",
                ephemeral: true,
            });
            }

            if (interaction.user.id !==thread.ownerId) {
                return await interaction.reply({ content: 'You are not the creator of this post', ephemeral: true });
            }

            await thread.setArchived(false); 
            await interaction.reply({ content: `Post reopened!`, ephemeral: false });
        } catch (error) {
            console.error(error);
            return interaction.reply({
                content: 'Failed to fetch or reopen that post. Make sure I have access to it.',
                ephemeral: true,
            });
        }
    }
}


