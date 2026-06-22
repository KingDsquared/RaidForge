const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const db = require("./db");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const DATABASE_URL = process.env.DATABASE_URL;

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !DATABASE_URL) {
  console.error("Missing Railway variables.");
  console.error("Need DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, DATABASE_URL");
  process.exit(1);
}

const roles = ["Tank", "Healer", "Melee DPS", "Ranged DPS", "Flex"];

const specs = {
  Tank: ["Blood DK", "Vengeance DH", "Guardian Druid", "Brewmaster Monk", "Protection Paladin", "Protection Warrior"],
  Healer: ["Holy Paladin", "Restoration Druid", "Mistweaver Monk", "Holy Priest", "Discipline Priest", "Restoration Shaman", "Preservation Evoker"],
  "Melee DPS": ["Arms Warrior", "Fury Warrior", "Frost DK", "Unholy DK", "Havoc DH", "Feral Druid", "Windwalker Monk", "Retribution Paladin", "Assassination Rogue", "Outlaw Rogue", "Subtlety Rogue", "Enhancement Shaman", "Survival Hunter"],
  "Ranged DPS": ["Arcane Mage", "Fire Mage", "Frost Mage", "Balance Druid", "Beast Mastery Hunter", "Marksmanship Hunter", "Devastation Evoker", "Shadow Priest", "Elemental Shaman", "Affliction Warlock", "Demonology Warlock", "Destruction Warlock"],
  Flex: ["Flexible"]
};

const commands = [
  new SlashCommandBuilder()
    .setName("raid-create")
    .setDescription("Create a raid signup")
    .addStringOption(o => o.setName("title").setDescription("Raid title").setRequired(true))
    .addStringOption(o => o.setName("time").setDescription("Raid time").setRequired(true))
    .addStringOption(o => o.setName("note").setDescription("Optional note").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-list")
    .setDescription("Show recent raids"),

  new SlashCommandBuilder()
    .setName("raid-roster")
    .setDescription("Show a raid roster")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-edit")
    .setDescription("Edit raid title, time, or note")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addStringOption(o => o.setName("title").setDescription("New title").setRequired(false))
    .addStringOption(o => o.setName("time").setDescription("New time").setRequired(false))
    .addStringOption(o => o.setName("note").setDescription("New note").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-note")
    .setDescription("Update raid note")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addStringOption(o => o.setName("note").setDescription("New note").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-close")
    .setDescription("Close raid signups")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-open")
    .setDescription("Open raid signups")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-delete")
    .setDescription("Delete a raid")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-ping")
    .setDescription("Ping everyone signed up")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addStringOption(o => o.setName("message").setDescription("Optional message").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-template-create")
    .setDescription("Create a reusable raid template")
    .addStringOption(o => o.setName("name").setDescription("Template name").setRequired(true))
    .addStringOption(o => o.setName("title").setDescription("Raid title").setRequired(true))
    .addStringOption(o => o.setName("note").setDescription("Template note").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-template-use")
    .setDescription("Create a raid from a template")
    .addStringOption(o => o.setName("name").setDescription("Template name").setRequired(true))
    .addStringOption(o => o.setName("time").setDescription("Raid time").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-template-list")
    .setDescription("List raid templates"),

  new SlashCommandBuilder()
    .setName("attendance-mark")
    .setDescription("Mark attendance for a user")
    .addStringOption(o => o.setName("raid_id").setDescription("Raid ID").setRequired(true))
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addBooleanOption(o => o.setName("attended").setDescription("Did they attend?").setRequired(true)),

  new SlashCommandBuilder()
    .setName("attendance-view")
    .setDescription("View raid attendance")
    .addStringOption(o => o.setName("raid_id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("character-link")
    .setDescription("Link a WoW character")
    .addStringOption(o => o.setName("name").setDescription("Character name").setRequired(true))
    .addStringOption(o => o.setName("realm").setDescription("Realm").setRequired(true))
    .addStringOption(o => o.setName("region").setDescription("Region, example: eu or us").setRequired(true))
    .addStringOption(o => o.setName("class").setDescription("Class").setRequired(false))
    .addBooleanOption(o => o.setName("main").setDescription("Main character?").setRequired(false)),

  new SlashCommandBuilder()
    .setName("character-list")
    .setDescription("List your linked characters")
].map(c => c.toJSON());

function buttons(raidId, closed = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`raid:join:${raidId}`).setLabel("Join").setStyle(ButtonStyle.Success).setDisabled(closed),
      new ButtonBuilder().setCustomId(`raid:late:${raidId}`).setLabel("Late").setStyle(ButtonStyle.Primary).setDisabled(closed),
      new ButtonBuilder().setCustomId(`raid:maybe:${raidId}`).setLabel("Maybe").setStyle(ButtonStyle.Secondary).setDisabled(closed),
      new ButtonBuilder().setCustomId(`raid:absent:${raidId}`).setLabel("Absent").setStyle(ButtonStyle.Danger).setDisabled(closed),
      new ButtonBuilder().setCustomId(`raid:withdraw:${raidId}`).setLabel("Withdraw").setStyle(ButtonStyle.Secondary)
    )
  ];
}

function roleMenu(raidId) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`role:${raidId}`)
        .setPlaceholder("Choose your raid role")
        .addOptions(roles.map(r => ({ label: r, value: r })))
    )
  ];
}

function specMenu(raidId, role) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`spec:${raidId}:${role}`)
        .setPlaceholder("Choose your spec")
        .addOptions(specs[role].map(s => ({ label: s, value: s })))
    )
  ];
}

function raidEmbed(raid) {
  const signups = raid.signups || [];
  const byStatus = status => signups.filter(s => s.status === status);

  const going = byStatus("Going");
  const late = byStatus("Late");
  const maybe = byStatus("Maybe");
  const absent = byStatus("Absent");

  const goingText = roles.map(role => {
    const people = going.filter(s => s.role === role);
    if (!people.length) return null;

    return `**${role} (${people.length})**\n${people
      .map(p => `• ${p.username}${p.spec ? ` — ${p.spec}` : ""}`)
      .join("\n")}`;
  }).filter(Boolean).join("\n\n") || "Nobody";

  const list = arr => arr.length
    ? arr.map(p => `• ${p.username}${p.spec ? ` — ${p.spec}` : ""}`).join("\n")
    : "Nobody";

  return new EmbedBuilder()
    .setTitle(`Raid: ${raid.title}`)
    .setDescription(
      `**Time:** ${raid.time}\n` +
      `**Status:** ${raid.status}\n` +
      `**Note:** ${raid.note || "None"}\n\n` +
      `No signup limits.`
    )
    .addFields(
      { name: `Going (${going.length})`, value: goingText },
      { name: `Late (${late.length})`, value: list(late) },
      { name: `Maybe (${maybe.length})`, value: list(maybe) },
      { name: `Absent (${absent.length})`, value: list(absent) }
    )
    .setFooter({ text: `Raid ID: ${raid.id}` });
}

async function refreshRaidMessage(client, raid) {
  if (!raid || !raid.messageId) return;

  const channel = await client.channels.fetch(raid.channelId);
  const message = await channel.messages.fetch(raid.messageId);

  await message.edit({
    embeds: [raidEmbed(raid)],
    components: buttons(raid.id, raid.status === "CLOSED")
  });
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("Slash commands registered.");
}

async function createRaidPost(interaction, raid) {
  await db.createRaid(raid);

  const msg = await interaction.reply({
    embeds: [raidEmbed(raid)],
    components: buttons(raid.id),
    fetchReply: true
  });

  await db.setRaidMessageId(raid.id, msg.id);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async c => {
  console.log(`Logged in as ${c.user.tag}`);
  await db.initDb();
  console.log("Database ready.");
  await registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const name = interaction.commandName;

      if (name === "raid-create") {
        const raid = {
          id: Date.now().toString(),
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          title: interaction.options.getString("title", true),
          time: interaction.options.getString("time", true),
          note: interaction.options.getString("note") || "",
          createdBy: interaction.user.id,
          status: "OPEN",
          signups: []
        };

        await createRaidPost(interaction, raid);
        return;
      }

      if (name === "raid-list") {
        const raids = await db.listRaids(interaction.guildId);

        if (!raids.length) {
          await interaction.reply({ content: "No raids found.", ephemeral: true });
          return;
        }

        const text = raids.map(r =>
          `**${r.title}** — ${r.raid_time}\nStatus: ${r.status} | ID: \`${r.id}\``
        ).join("\n\n");

        await interaction.reply({ content: text, ephemeral: true });
        return;
      }

      if (name === "raid-roster") {
        const raid = await db.getRaid(interaction.options.getString("id", true));
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        await interaction.reply({ embeds: [raidEmbed(raid)], ephemeral: true });
        return;
      }

      if (name === "raid-edit") {
        const id = interaction.options.getString("id", true);
        const raid = await db.updateRaid(id, {
          title: interaction.options.getString("title"),
          time: interaction.options.getString("time"),
          note: interaction.options.getString("note") ?? undefined
        });

        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        await refreshRaidMessage(client, raid);
        await interaction.reply({ content: `Updated raid: **${raid.title}**`, ephemeral: true });
        return;
      }

      if (name === "raid-note") {
        const id = interaction.options.getString("id", true);
        const note = interaction.options.getString("note", true);

        const raid = await db.updateRaid(id, { note });
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        await refreshRaidMessage(client, raid);
        await interaction.reply({ content: "Raid note updated.", ephemeral: true });
        return;
      }

      if (name === "raid-close" || name === "raid-open") {
        const id = interaction.options.getString("id", true);
        const status = name === "raid-close" ? "CLOSED" : "OPEN";

        const raid = await db.setRaidStatus(id, status);
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        await refreshRaidMessage(client, raid);
        await interaction.reply({ content: `Raid is now ${status}.`, ephemeral: true });
        return;
      }

      if (name === "raid-delete") {
        const id = interaction.options.getString("id", true);
        const raid = await db.getRaid(id);

        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        try {
          const channel = await client.channels.fetch(raid.channelId);
          const message = await channel.messages.fetch(raid.messageId);
          await message.delete();
        } catch {}

        await db.deleteRaid(id);
        await interaction.reply({ content: `Deleted raid: **${raid.title}**`, ephemeral: true });
        return;
      }

      if (name === "raid-ping") {
        const id = interaction.options.getString("id", true);
        const message = interaction.options.getString("message") || "Raid reminder.";

        const raid = await db.getRaid(id);
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        const signed = raid.signups.filter(s => s.status !== "Absent");

        if (!signed.length) {
          return interaction.reply({ content: "Nobody is signed up to ping.", ephemeral: true });
        }

        await interaction.reply({
          content: `**${raid.title}**\n${message}\n\n${signed.map(s => `<@${s.userId}>`).join(" ")}`,
          allowedMentions: { users: signed.map(s => s.userId) }
        });

        return;
      }

      if (name === "raid-template-create") {
        const templateId = await db.createTemplate({
          guildId: interaction.guildId,
          name: interaction.options.getString("name", true),
          title: interaction.options.getString("title", true),
          note: interaction.options.getString("note") || "",
          createdBy: interaction.user.id
        });

        await interaction.reply({ content: `Template created. ID: \`${templateId}\``, ephemeral: true });
        return;
      }

      if (name === "raid-template-list") {
        const templates = await db.listTemplates(interaction.guildId);

        if (!templates.length) {
          return interaction.reply({ content: "No templates found.", ephemeral: true });
        }

        const text = templates.map(t => `**${t.name}** → ${t.title}`).join("\n");
        await interaction.reply({ content: text, ephemeral: true });
        return;
      }

      if (name === "raid-template-use") {
        const templateName = interaction.options.getString("name", true);
        const template = await db.getTemplate(interaction.guildId, templateName);

        if (!template) {
          return interaction.reply({ content: "Template not found.", ephemeral: true });
        }

        const raid = {
          id: Date.now().toString(),
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          title: template.title,
          time: interaction.options.getString("time", true),
          note: template.note || "",
          createdBy: interaction.user.id,
          status: "OPEN",
          signups: []
        };

        await createRaidPost(interaction, raid);
        return;
      }

      if (name === "attendance-mark") {
        const raidId = interaction.options.getString("raid_id", true);
        const user = interaction.options.getUser("user", true);
        const attended = interaction.options.getBoolean("attended", true);

        const raid = await db.getRaid(raidId);
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        await db.markAttendance({
          raidId,
          userId: user.id,
          username: user.username,
          attended,
          markedBy: interaction.user.id
        });

        await interaction.reply({
          content: `Attendance marked for ${user}: ${attended ? "attended" : "missed"}.`,
          ephemeral: true
        });
        return;
      }

      if (name === "attendance-view") {
        const raidId = interaction.options.getString("raid_id", true);
        const rows = await db.getAttendance(raidId);

        if (!rows.length) {
          return interaction.reply({ content: "No attendance marked yet.", ephemeral: true });
        }

        const text = rows.map(r => `${r.attended ? "✅" : "❌"} ${r.username}`).join("\n");
        await interaction.reply({ content: text, ephemeral: true });
        return;
      }

      if (name === "character-link") {
        const id = await db.linkCharacter({
          guildId: interaction.guildId,
          userId: interaction.user.id,
          name: interaction.options.getString("name", true),
          realm: interaction.options.getString("realm", true),
          region: interaction.options.getString("region", true),
          className: interaction.options.getString("class") || null,
          isMain: interaction.options.getBoolean("main") || false
        });

        await interaction.reply({ content: `Character linked. ID: \`${id}\``, ephemeral: true });
        return;
      }

      if (name === "character-list") {
        const chars = await db.listCharacters(interaction.guildId, interaction.user.id);

        if (!chars.length) {
          return interaction.reply({ content: "No characters linked.", ephemeral: true });
        }

        const text = chars.map(c =>
          `${c.is_main ? "⭐ " : ""}${c.name}-${c.realm} (${c.region})${c.class_name ? ` — ${c.class_name}` : ""}`
        ).join("\n");

        await interaction.reply({ content: text, ephemeral: true });
        return;
      }
    }

    if (interaction.isButton()) {
      const [type, action, raidId] = interaction.customId.split(":");
      if (type !== "raid") return;

      const raid = await db.getRaid(raidId);
      if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

      if (raid.status === "CLOSED" && action !== "withdraw") {
        return interaction.reply({ content: "This raid is closed.", ephemeral: true });
      }

      if (action === "join") {
        await interaction.reply({
          content: "Choose your role:",
          components: roleMenu(raidId),
          ephemeral: true
        });
        return;
      }

      const statusMap = {
        late: "Late",
        maybe: "Maybe",
        absent: "Absent"
      };

      let updatedRaid;

      if (action === "withdraw") {
        updatedRaid = await db.removeSignup(raidId, interaction.user.id);
      } else {
        updatedRaid = await db.upsertSignup({
          raidId,
          userId: interaction.user.id,
          username: interaction.member?.displayName || interaction.user.username,
          status: statusMap[action],
          role: null,
          spec: null
        });
      }

      await interaction.update({
        embeds: [raidEmbed(updatedRaid)],
        components: buttons(updatedRaid.id, updatedRaid.status === "CLOSED")
      });

      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("role:")) {
        const [, raidId] = interaction.customId.split(":");
        const raid = await db.getRaid(raidId);

        if (!raid || raid.status === "CLOSED") {
          return interaction.update({ content: "This raid is closed or missing.", components: [] });
        }

        const role = interaction.values[0];

        await interaction.update({
          content: `Role selected: **${role}**. Now choose spec:`,
          components: specMenu(raidId, role)
        });

        return;
      }

      if (interaction.customId.startsWith("spec:")) {
        const [, raidId, role] = interaction.customId.split(":");
        const spec = interaction.values[0];

        const raid = await db.getRaid(raidId);
        if (!raid || raid.status === "CLOSED") {
          return interaction.update({ content: "This raid is closed or missing.", components: [] });
        }

        const updatedRaid = await db.upsertSignup({
          raidId,
          userId: interaction.user.id,
          username: interaction.member?.displayName || interaction.user.username,
          status: "Going",
          role,
          spec
        });

        await refreshRaidMessage(client, updatedRaid);

        await interaction.update({
          content: `Signed up as **${spec}**.`,
          components: []
        });

        return;
      }
    }
  } catch (err) {
    console.error("Interaction error:");
    console.error(err);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Something went wrong.", ephemeral: true });
    }
  }
});

client.login(TOKEN);
