import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} from 'discord.js';

const ROLE_SPEC_OPTIONS = [
  { label: 'Tank - Protection Warrior', value: 'TANK|Warrior|Protection' },
  { label: 'Tank - Blood Death Knight', value: 'TANK|Death Knight|Blood' },
  { label: 'Tank - Guardian Druid', value: 'TANK|Druid|Guardian' },
  { label: 'Healer - Holy Paladin', value: 'HEALER|Paladin|Holy' },
  { label: 'Healer - Restoration Druid', value: 'HEALER|Druid|Restoration' },
  { label: 'Healer - Discipline Priest', value: 'HEALER|Priest|Discipline' },
  { label: 'Melee DPS - Havoc Demon Hunter', value: 'MELEE_DPS|Demon Hunter|Havoc' },
  { label: 'Melee DPS - Retribution Paladin', value: 'MELEE_DPS|Paladin|Retribution' },
  { label: 'Ranged DPS - Mage', value: 'RANGED_DPS|Mage|Any' },
  { label: 'Ranged DPS - Warlock', value: 'RANGED_DPS|Warlock|Any' },
  { label: 'Ranged DPS - Hunter', value: 'RANGED_DPS|Hunter|Any' },
  { label: 'Flex / Unsure', value: 'FLEX|Unknown|Unsure' }
];

function namesFor(raid, status, role = null) {
  return raid.signups
    .filter(s => s.status === status && (!role || s.role === role))
    .map(s => `• <@${s.userId}>${s.className ? ` — ${s.spec} ${s.className}` : ''}`)
    .join('\n') || 'None yet';
}

function countFor(raid, status, role = null) {
  return raid.signups.filter(s => s.status === status && (!role || s.role === role)).length;
}

export function raidEmbed(raid) {
  const going = countFor(raid, 'GOING');
  const late = countFor(raid, 'LATE');
  const maybe = countFor(raid, 'MAYBE');
  const absent = countFor(raid, 'ABSENT');

  return new EmbedBuilder()
    .setTitle(`RaidForge: ${raid.title}`)
    .setDescription([
      `**When:** ${raid.starts}`,
      raid.note ? `**Note:** ${raid.note}` : null,
      '',
      '**No signup limits:** everyone can sign up. Officers can sort the final roster later.'
    ].filter(Boolean).join('\n'))
    .addFields(
      { name: `Going (${going})`, value: `**Tanks (${countFor(raid, 'GOING', 'TANK')})**\n${namesFor(raid, 'GOING', 'TANK')}\n\n**Healers (${countFor(raid, 'GOING', 'HEALER')})**\n${namesFor(raid, 'GOING', 'HEALER')}\n\n**Melee DPS (${countFor(raid, 'GOING', 'MELEE_DPS')})**\n${namesFor(raid, 'GOING', 'MELEE_DPS')}\n\n**Ranged DPS (${countFor(raid, 'GOING', 'RANGED_DPS')})**\n${namesFor(raid, 'GOING', 'RANGED_DPS')}\n\n**Flex (${countFor(raid, 'GOING', 'FLEX')})**\n${namesFor(raid, 'GOING', 'FLEX')}` },
      { name: `Late (${late})`, value: namesFor(raid, 'LATE'), inline: true },
      { name: `Maybe (${maybe})`, value: namesFor(raid, 'MAYBE'), inline: true },
      { name: `Absent (${absent})`, value: namesFor(raid, 'ABSENT'), inline: true }
    )
    .setFooter({ text: `Raid ID: ${raid.id}` })
    .setTimestamp(new Date(raid.createdAt));
}

export function signupButtons(raidId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`raid:${raidId}:join`).setLabel('Join').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`raid:${raidId}:late`).setLabel('Late').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`raid:${raidId}:maybe`).setLabel('Maybe').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`raid:${raidId}:absent`).setLabel('Absent').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`raid:${raidId}:withdraw`).setLabel('Withdraw').setStyle(ButtonStyle.Danger)
  );
}

export function roleSpecMenu(raidId, status) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`raid:${raidId}:spec:${status}`)
      .setPlaceholder('Choose your role/class/spec')
      .addOptions(ROLE_SPEC_OPTIONS)
  );
}
