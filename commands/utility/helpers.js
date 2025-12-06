const { SlashCommandBuilder, Collection } = require('discord.js');

const cooldowns = new Collection();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('helpers')
        .setDescription('Helper command group')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('ping')
                .setDescription('Ping a helper role')
                .addStringOption((option) =>
                    option
                        .setName('role')
                        .setDescription('Select a Helper (Active) role')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                
        ),

    async autocomplete(interaction) {
        // Only handle /helpers ping autocomplete
        const subcommand = interaction.options.getSubcommand();
        if (subcommand !== 'ping') return;

        const focused = interaction.options.getFocused();
        const roles = interaction.guild.roles.cache
            .filter((role) => role.name.endsWith('Helper (Active)'))
            .map((role) => ({
                name: role.name,
                value: role.id,
            }));

        // Filter by user input
        const filtered = roles.filter((r) =>
            r.name.toLowerCase().includes(focused.toLowerCase())
        );

        await interaction.respond(filtered.slice(0, 25)); // Discord limit
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'ping') {
            const roleId = interaction.options.getString('role', true);
            const role = interaction.guild.roles.cache.get(roleId);
            const userId = interaction.user.id;
            const QUESTS_FORUM_ID = "1413321056805982229"; // replace with your actual forum channel ID
            const thread = interaction.channel;
            if (!thread) {
            thread = await interaction.guild.channels.fetch(interaction.channelId);
            }
            // Check if the command is used in the Quests forum or any of its threads
            if (!thread || thread.parentId !== QUESTS_FORUM_ID) {
              return interaction.reply({
                content: `❌ This command can only be used in the <#${QUESTS_FORUM_ID}> forum.`,
                ephemeral: true,
              });
            }


            if (!role || !role.name.endsWith('Helper (Active)')) {
                return await interaction.reply({
                    content: `❌ The selected role is not a valid Helper (Active) role.`,
                    ephemeral: true,
                });
            }

            if (userId !== thread.ownerId) {
                return await interaction.reply({
                    content: `❌ You are not the creator of this post.`,
                    ephemeral: true,
                });
            }

            const cooldownTime = 2*(60 * 60 * 1000); // 2 hours
            const lastUsed = cooldowns.get(userId);

            if (lastUsed && Date.now() - lastUsed < cooldownTime) {
                const remaining = Math.ceil((cooldownTime - (Date.now() - lastUsed)) / 60000);
                return await interaction.reply({
                    content: `⌛ You can ping another helper role in ${remaining} minutes.`,
                    ephemeral: true,
                });
            }  

            // Set the cooldown
            cooldowns.set(userId, Date.now());
            // ✅ Ping the role
            await interaction.reply({
                content: `🔔 <@&${role.id}> has been pinged by <@${userId}>!`,
                allowedMentions: { roles: [role.id] },
            });
        }
    },
};
