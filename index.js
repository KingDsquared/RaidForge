require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`${client.user.tag} is online!`);
});

client.on('guildMemberAdd', async (member) => {
  const channel = member.guild.channels.cache.find(
    c => c.name === 'welcome'
  );

  if (!channel) return;

  await channel.send(`
👋 Welcome to **${member.guild.name}**, ${member}!

Before applying, please make sure your **Path of Exile account is set to Public** so our officers can review your profile.

Once your account has been reviewed and approved, head over to **#apply** and submit an application for:

⚔️ Path of Exile 1
⚔️ Path of Exile 2

Please include your Path of Exile account name.

Welcome to the community, Exile!
`);
});

client.login(process.env.TOKEN);
