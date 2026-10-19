const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'guildConfigs.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeAll(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function defaultConfig() {
  return {
    enabled: true,
    ownerIds: [],
    autoLog: {
      enabled: false,
      sourceGuildId: null,
      targetGuildId: null,
      categoryId: null,
      channels: {},
    },
    syndicateIds: [],
    syndicatRoleIds: [],
    inspecteurRoleIds: [],
    chefGestionRoleIds: [],
    gestionStaffRoleIds: [],
    gestionAbusRoleIds: [],
  };
}

function getGuildConfig(guildId) {
  const all = readAll();
  const saved = all[guildId] || {};
  const config = { ...defaultConfig(), ...saved };
  config.autoLog = { ...defaultConfig().autoLog, ...(saved.autoLog || {}), channels: { ...defaultConfig().autoLog.channels, ...(saved.autoLog?.channels || {}) } };
  for (const key of ['syndicatRoleIds', 'inspecteurRoleIds', 'chefGestionRoleIds', 'gestionStaffRoleIds', 'gestionAbusRoleIds']) {
    config[key] = Array.isArray(config[key]) ? config[key] : [];
  }
  all[guildId] = config;
  writeAll(all);
  return config;
}

function updateGuildConfig(guildId, updater) {
  const all = readAll();
  const saved = all[guildId] || {};
  const current = { ...defaultConfig(), ...saved };
  current.autoLog = { ...defaultConfig().autoLog, ...(saved.autoLog || {}), channels: { ...defaultConfig().autoLog.channels, ...(saved.autoLog?.channels || {}) } };
  for (const key of ['syndicatRoleIds', 'inspecteurRoleIds', 'chefGestionRoleIds', 'gestionStaffRoleIds', 'gestionAbusRoleIds']) {
    current[key] = Array.isArray(current[key]) ? current[key] : [];
  }
  const updated = { ...current, ...updater(current) };
  all[guildId] = updated;
  writeAll(all);
  return updated;
}

module.exports = { getGuildConfig, updateGuildConfig };
