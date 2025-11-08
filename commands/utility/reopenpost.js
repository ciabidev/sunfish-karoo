const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reopenpost')
        .setDescription('Reopen a closed & locked post based on thread ID')
        .addStringOption((option) => option.setName('thread_id').setDescription('The Thread ID of the post to reopen').setRequired(true)),
    async execute(interaction) {
        const threadId = interaction.options.getString('thread_id', true);

        try {
            const fetchedThread = await interaction.guild.channels.fetch(threadId);

            if (!fetchedThread || !fetchedThread.isThread()) {
                return await interaction.reply({ content: 'This post does not exist (maybe you used the wrong ID?)', ephemeral: true });
            }

            if (interaction.user.id !==fetchedThread.ownerId) {
                return await interaction.reply({ content: 'You are not the creator of this post', ephemeral: true });
            }

            thread = fetchedThread;
            await thread.setLocked(false); // locked
            await thread.setArchived(false); // archived
            await interaction.reply({ content: `Post <#${thread.id}> reopened!`, ephemeral: false });
        } catch (error) {
            console.error(error);
            return interaction.reply({
                content: 'Failed to fetch or reopen that post. Make sure I have access to it.',
                ephemeral: true,
            });
        }
    }
}


