const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('closepost')
        .setDescription('Close & lock the current post.'),

    async execute(interaction) {
        let thread = interaction.channel;
        if (!thread.isThread()) {
            return await interaction.reply({ content: 'This command can only be used in a post', ephemeral: true });
        }

        if (interaction.user.id !==thread.ownerId) {
            return await interaction.reply({ content: 'You are not the creator of this post', ephemeral: true });
        }

        await interaction.reply({ content: `Post closed. Reopen later with /reopenpost ${thread.id}`, ephemeral: false });
        await thread.setLocked(true); // locked
        await thread.setArchived(true); // archived
    }
}


