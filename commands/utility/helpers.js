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
                        .setDescription('Select an Active Helper or Seal role')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                
        ),

    async autocomplete(interaction) {
        // Only handle /helpers ping autocomplete
        if (interaction.options.getSubcommand() === 'ping' && interaction.guild) { 

        const focused = interaction.options.getFocused();
        let roles;
        if (interaction.channel.id === '1463002217886908496') { // quick-help channel, should only show Helper (Active) roles
            roles = interaction.guild.roles.cache
                .filter((role) => (role.name.endsWith('Helper (Active)') && role.name !== 'Sunfish Seal'))
                .map((role) => ({
                    name: role.name,
                    value: role.id,
                }));
        } else { // quest board, should only show Seal roles
            roles = interaction.guild.roles.cache
                .filter((role) => (role.name.endsWith('Seal') && role.name !== 'Sunfish Seal'))
                .map((role) => ({
                    name: role.name,
                    value: role.id,
                }));
        }

        // Filter by user input
        const filtered = roles.filter((r) =>
            r.name.toLowerCase().includes(focused.toLowerCase())
        );

        // sort by seal and active groups 
        filtered.sort((a, b) => {
            if (a.name.endsWith('Helper (Active)') && !b.name.endsWith('Helper (Active)')) {
                return 1;
            }
            if (!a.name.endsWith('Helper (Active)') && b.name.endsWith('Helper (Active)')) {
                return -1;
            }
            if (a.name.endsWith('Seal') && !b.name.endsWith('Seal')) {
                return 1;
            }
            if (!a.name.endsWith('Seal') && b.name.endsWith('Seal')) {
                return -1; 
            }
            return 0;
        });

        

        await interaction.respond(filtered.slice(0, 25)); // Discord limit
        }
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
                  if (
                    !role ||
                    (!role.name.endsWith("Helper (Active)") && !role.name.endsWith("Seal"))
                  ) {
                    return await interaction.reply({
                      content: `❌ The selected role is not a valid Helper role.`,
                      ephemeral: true,
                    });
                  }
           if (thread.parentId !== QUESTS_FORUM_ID && role.name.endsWith('Seal')) {
             return await interaction.reply({
               content: `❌ You can only ping a non-Seal Helper role in this channel. For help that isn't just casual, see <#1413321056805982229>`,
               ephemeral: true,
             }); 
            }

           if (thread.parentId === QUESTS_FORUM_ID && userId !== thread.ownerId) {
             return await interaction.reply({
               content: `❌ You are not the creator of this post.`,
               ephemeral: true,
             });
           }

      
 
            if (thread.parentId === QUESTS_FORUM_ID && !role.name.endsWith('Seal')) {
                return await interaction.reply({
                  content: `You can only ping a Seal Helper role in this channel. For fast and informal/casual help, go to <#1463002217886908496>  `,
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
