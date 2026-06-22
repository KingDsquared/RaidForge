const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const { wowClasses, classEmoji, specs } = require("./config");

function raidButtons(raidId, closed = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`raid:join:${raidId}`)
        .setLabel("Sign Up")
        .setStyle(ButtonStyle.Success)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:bench:${raidId}`)
        .setLabel("Bench")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:late:${raidId}`)
        .setLabel("Late")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:maybe:${raidId}`)
        .setLabel("Tentative")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:absent:${raidId}`)
        .setLabel("Absence")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`raid:change:${raidId}`)
        .setLabel("Change Class/Spec")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:withdraw:${raidId}`)
        .setLabel("Withdraw")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function classMenu(raidId) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`class:${raidId}`)
        .setPlaceholder("Select your class")
        .addOptions(
          wowClasses.map(cls => ({
            label: cls,
            value: cls,
            emoji: classEmoji[cls]
          }))
        )
    )
  ];
}

function specMenu(raidId, className) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`spec:${raidId}:${className}`)
        .setPlaceholder(`Select your ${className} spec`)
        .addOptions(
          specs[className].map(row => ({
            label: row.spec,
            description: row.role,
            value: `${row.spec}|${row.role}`
          }))
        )
    )
  ];
}

function getCounts(signups = []) {
  const going = signups.filter(s => s.status === "Going");

  return {
    total: going.length,
    tank: going.filter(s => s.role === "Tank").length,
    healer: going.filter(s => s.role === "Healer").length,
    melee: going.filter(s => s.role === "Melee DPS").length,
    ranged: going.filter(s => s.role === "Ranged DPS").length
  };
}

function renderClassRoster(signups = []) {
  const going = signups.filter(s => s.status === "Going");
  if (!going.length) return "No signups yet.";

  const blocks = [];

  for (const cls of wowClasses) {
    const people = going.filter(s => s.className === cls);
    if (!people.length) continue;

    const lines = people.map(p => {
      let line = `• ${p.username}`;
      if (p.spec) line += ` — ${p.spec}`;
      if (p.note) line += ` (${p.note})`;
      return line;
    });

    blocks.push(`**${classEmoji[cls]} ${cls} (${people.length})**\n${lines.join("\n")}`);
  }

  return blocks.join("\n\n") || "No class signups yet.";
}

function renderStatus(signups = [], status) {
  const rows = signups.filter(s => s.status === status);
  if (!rows.length) return "Nobody";

  return rows.map(p => {
    let line = `• ${p.username}`;
    if (p.className) line += ` — ${p.className}`;
    if (p.spec) line += ` ${p.spec}`;
    if (p.note) line += ` (${p.note})`;
    return line;
  }).join("\n");
}

function buildRaidEmbed(raid) {
  const signups = raid.signups || [];
  const counts = getCounts(signups);

  return new EmbedBuilder()
    .setTitle(`Raid: ${raid.title}`)
    .setDescription(
      `🗓️ **Time:** ${raid.time}\n` +
      `📌 **Status:** ${raid.status}\n` +
      `📝 **Note:** ${raid.note || "None"}\n\n` +
      `👥 **${counts.total} signed**\n` +
      `🛡️ Tanks **${counts.tank}**  |  ✚ Healers **${counts.healer}**  |  ⚔️ Melee **${counts.melee}**  |  🏹 Ranged **${counts.ranged}**\n\n` +
      `__**Roster**__\n${renderClassRoster(signups)}`
    )
    .addFields(
      {
        name: `Bench (${signups.filter(s => s.status === "Bench").length})`,
        value: renderStatus(signups, "Bench")
      },
      {
        name: `Late (${signups.filter(s => s.status === "Late").length})`,
        value: renderStatus(signups, "Late")
      },
      {
        name: `Tentative (${signups.filter(s => s.status === "Maybe").length})`,
        value: renderStatus(signups, "Maybe")
      },
      {
        name: `Absence (${signups.filter(s => s.status === "Absent").length})`,
        value: renderStatus(signups, "Absent")
      }
    )
    .setFooter({ text: `Raid ID: ${raid.id}` });
}

function buildRaidListText(raids) {
  if (!raids.length) return "No raids found.";

  return raids.map(r =>
    `**${r.title}** — ${r.raid_time}\nStatus: ${r.status} | ID: \`${r.id}\``
  ).join("\n\n");
}

function buildTemplateListText(templates) {
  if (!templates.length) return "No templates found.";

  return templates.map(t =>
    `**${t.name}** → ${t.title}${t.note ? `\nNote: ${t.note}` : ""}`
  ).join("\n\n");
}

function buildRecurringListText(rows) {
  if (!rows.length) return "No recurring raids found.";

  return rows.map(r =>
    `**${r.template_name}** — ${r.day_of_week} ${r.time_of_day}\nID: \`${r.id}\``
  ).join("\n\n");
}

function buildCharacterListText(characters) {
  if (!characters.length) return "No characters linked.";

  return characters.map(c =>
    `${c.is_main ? "⭐ " : ""}${c.name}-${c.realm} (${c.region})${c.class_name ? ` — ${c.class_name}` : ""}`
  ).join("\n");
}

function buildReminderListText(reminders) {
  if (!reminders.length) return "No reminders set.";

  return reminders.map(r => `• ${r.minutes_before} minutes before`).join("\n");
}

function buildAttendanceText(rows) {
  if (!rows.length) return "No attendance marked yet.";

  return rows.map(r => `${r.attended ? "✅" : "❌"} ${r.username}`).join("\n");
}

function buildRaidExportText(exportData) {
  const { raid, attendance } = exportData;
  if (!raid) return "Raid not found.";

  const signupLines = (raid.signups || []).map(s =>
    `${s.username} | ${s.status} | ${s.className || ""} | ${s.role || ""} | ${s.spec || ""} | ${s.note || ""}`
  );

  const attendanceLines = (attendance || []).map(a =>
    `${a.username} | ${a.attended ? "Attended" : "Missed"}`
  );

  return [
    `Raid Export`,
    `Raid ID: ${raid.id}`,
    `Title: ${raid.title}`,
    `Time: ${raid.time}`,
    `Status: ${raid.status}`,
    `Note: ${raid.note || "None"}`,
    ``,
    `--- Signups ---`,
    signupLines.length ? signupLines.join("\n") : "No signups.",
    ``,
    `--- Attendance ---`,
    attendanceLines.length ? attendanceLines.join("\n") : "No attendance."
  ].join("\n");
}

module.exports = {
  raidButtons,
  classMenu,
  specMenu,
  buildRaidEmbed,
  buildRaidListText,
  buildTemplateListText,
  buildRecurringListText,
  buildCharacterListText,
  buildReminderListText,
  buildAttendanceText,
  buildRaidExportText
};
