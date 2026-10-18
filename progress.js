// Only game fields cross the account boundary. Never import authentication data.
function normalizeProgress(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const result = { schemaVersion: 1 };
  for (const key of ['totalXp', 'weeklyXp']) {
    result[key] = Number.isFinite(source[key]) && source[key] >= 0
      ? Math.min(1e9, Math.floor(source[key])) : defaults[key];
  }
  result.username = typeof source.username === 'string' && source.username.trim()
    ? source.username.trim().slice(0, 20) : defaults.username;
  const catalogs = { scanned: Object.keys(places), claimed: Object.keys(places),
    skins: skins.map(s => s.id), songs: songs.map(s => s.id), frames: frames.map(f => f.id) };
  for (const [key, allowed] of Object.entries(catalogs)) {
    result[key] = Array.isArray(source[key])
      ? [...new Set(source[key].filter(id => allowed.includes(id)))] : [...defaults[key]];
  }
  result.claimed = result.claimed.filter(id => result.scanned.includes(id));
  for (const [key, owned] of [['equippedSkin', 'skins'], ['equippedSong', 'songs'], ['equippedFrame', 'frames']]) {
    result[key] = key === 'equippedFrame' && source[key] === null ? null
      : result[owned].includes(source[key]) ? source[key] : result[owned][0] || null;
  }
  result.spotifyDemoV1 = true;
  result.musicMuted = source.musicMuted === true;
  awardVisitCosmetics(result);
  return result;
}
function mergeProgress(cloud, local, preferLocal = true) {
  const a = normalizeProgress(cloud), b = normalizeProgress(local);
  const result = { ...(preferLocal ? b : a) };
  for (const key of ['scanned', 'claimed', 'skins', 'songs', 'frames']) {
    result[key] = [...new Set([...a[key], ...b[key]])];
  }
  // Preserve independently visited locations without awarding the same visit twice.
  const missingXp = (one, other) => other.claimed.filter(id => !one.claimed.includes(id))
    .reduce((sum, id) => sum + places[id].xp, 0);
  result.totalXp = Math.max(a.totalXp + missingXp(a, b), b.totalXp + missingXp(b, a));
  result.weeklyXp = Math.max(a.weeklyXp, b.weeklyXp);
  return normalizeProgress(result);
}
