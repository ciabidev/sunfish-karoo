const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()

        .setName('quests')
        .setDescription('manage your quests')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('closepost')
                .setDescription('Closes the current quest post.')
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('reopenpost')
                .setDescription('Reopens a closed quest post based on the thread ID.')
                .addStringOption((option) => option.setName('thread_id').setDescription('The ID of the quest post to reopen').setRequired(true))
        ),
    async execute(interaction) {

        const subcommand = interaction.options.getSubcommand();

        // check if the user is the creator of the thread


        if (subcommand === 'close') {
            if (interaction.user.id !== interaction.channel.ownerId) {
                return await interaction.reply({ content: 'You are not the creator of this post', ephemeral: true });
            }

            // check if the command is executed in a thread
            let thread = interaction.channel;
            if (!interaction.channel.isThread()) {
                return await interaction.reply({ content: 'This command can only be used in a post', ephemeral: true });
            }

            await interaction.reply({ content: `Quest post closed, reopen with /quests reopen ${thread.id}`, ephemeral: false });
            await thread.setLocked(true); // locked
            await thread.setArchived(true); // archived
        }

        if (subcommand === 'reopen') {
            const threadId = interaction.options.getString('thread_id', true);

            try {
                const fetchedThread = await interaction.guild.channels.fetch(threadId);

                if (!fetchedThread || !fetchedThread.isThread()) {
                    return await interaction.reply({ content: 'This post does not exist (maybe you used the wrong ID?)', ephemeral: true });
                }

                thread = fetchedThread;
                await thread.setLocked(false); // locked
                await thread.setArchived(false); // archived
                await interaction.reply({ content: `Quest post <#${thread.id}> reopened!`, ephemeral: false });
            } catch (error) {
                console.error(error);
                return interaction.reply({
                    content: 'Failed to fetch or reopen that post. Make sure I have access to it.',
                    ephemeral: true,
                });
            }

        }
    }
}


