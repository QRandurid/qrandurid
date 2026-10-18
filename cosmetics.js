// Original QRändurid portraits and transparent profile ornaments.
const skinNames = {"s1": "Linnaseikleja", "s2": "Kalamaja rebane", "s3": "Sadama kapten", "s4": "Öötiib", "s5": "Neoonninja", "s6": "Pirita merineid", "s7": "Retrokass", "s8": "Vanalinna vaim", "s9": "Küberrändur", "s10": "Kuldne lõvi", "s11": "Pilooditüdruk", "s12": "Metsavaht", "s13": "Päikeseskeitija", "s14": "Süvamere sukelduja", "s15": "Tänavakunstnik", "s16": "Virmaliste hirv", "s17": "Pikselrüütel", "s18": "Päikesesamurai", "s19": "Glitch-meduus", "s20": "Kuumaag", "s21": "Kristallgolem", "s22": "Tallinna draakon", "s23": "Kosmosekülaline", "s24": "Põhjala valküür"};
const frames = [{"id": "f1", "name": "Neoonring", "rarity": "COMMON", "color": "#b5a0ff"}, {"id": "f2", "name": "Metsik aed", "rarity": "COMMON", "color": "#9edb9c"}, {"id": "f3", "name": "Arkaad", "rarity": "COMMON", "color": "#f6b4ce"}, {"id": "f4", "name": "Jäälill", "rarity": "RARE", "color": "#b9efff"}, {"id": "f5", "name": "Korallilaht", "rarity": "RARE", "color": "#f9acaa"}, {"id": "f6", "name": "Kuuorbiit", "rarity": "RARE", "color": "#cbc7ff"}, {"id": "f7", "name": "Varjuroos", "rarity": "EPIC", "color": "#e39bbd"}, {"id": "f8", "name": "Tormisüda", "rarity": "EPIC", "color": "#a4d6ff"}, {"id": "f9", "name": "Tähekaart", "rarity": "EPIC", "color": "#d6a8ff"}, {"id": "f10", "name": "Draakonivalve", "rarity": "LEGENDARY", "color": "#f6bf82"}, {"id": "f11", "name": "Päikesekroon", "rarity": "LEGENDARY", "color": "#ffe4a1"}, {"id": "f12", "name": "Fööniksileek", "rarity": "LEGENDARY", "color": "#ffb084"}];
function skinArt(skin) {
  const id = skinNames[skin?.id] ? skin.id : 's1';
  return `<img class="skinArt" src="art/${id}.svg" alt="" aria-hidden="true" width="160" height="160">`;
}
function currentFrame() { return frames.find(frame => frame.id === state.equippedFrame) || null; }
function avatarArt(skin, frame = null) {
  return `<span class="avatarStage ${frame ? 'hasFrame' : ''}">${skinArt(skin)}${frame ? `<img class="frameArt" src="art/${frame.id}.svg" alt="" aria-hidden="true" width="160" height="160">` : ''}</span>`;
}
function cosmeticTab(type) {
  for (const tab of document.querySelectorAll('[data-cosmetic-tab]')) {
    const selected = tab.dataset.cosmeticTab === type;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
}
function renderFrames() {
  document.getElementById('framesCount').textContent = `${state.frames.length}/${frames.length}`;
  const query = document.getElementById('frameSearch').value;
  const rarity = document.getElementById('frameRarity').value;
  const list = frames.filter(frame => matchesCatalog(frame, query, rarity));
  document.getElementById('framesGrid').innerHTML = list.map(frame => {
    const owned = state.frames.includes(frame.id), selected = state.equippedFrame === frame.id;
    return `<button class="collectible frameCard ${rarityClass(frame.rarity)} ${selected ? 'equipped' : ''}" onclick="previewFrame('${frame.id}')" aria-label="${frame.name}${owned ? '' : ' — lukus'}" style="--frame-accent:${frame.color}"><span class="framePreview">${avatarArt(currentSkin(), frame)}</span><span class="tag ${rarityClass(frame.rarity)}">${frame.rarity}</span><h3>${frame.name}</h3><p>${selected ? 'Sinu profiilil' : owned ? 'Olemas · vaata ja vali' : 'Lukus · ava QR-preemiaga'}</p></button>`;
  }).join('') || '<p class="emptyState">Sellist raami ei leitud.</p>';
  document.getElementById('lookPreview').innerHTML = `${avatarArt(currentSkin(), currentFrame())}<div><span class="tag">SINU KOMBINATSIOON</span><h3>${currentSkin().name}</h3><p>${currentFrame()?.name || 'Ilma raamita'} · muuda skini ja raami eraldi</p><button class="removeFrame" onclick="equipFrame(null)" ${currentFrame() ? '' : 'disabled'}>Eemalda raam</button></div>`;
}
function equipFrame(id) {
  if (id !== null && !state.frames.includes(id)) return;
  state.equippedFrame = id;
  save();
  notify(id === null ? 'Profiiliraam eemaldatud.' : 'Profiiliraam valitud.');
}
function previewFrame(id) {
  const frame = frames.find(item => item.id === id);
  if (!frame) return;
  const owned = state.frames.includes(id);
  openSheet(`<div class="cosmeticDetail"><span class="tag ${rarityClass(frame.rarity)}">${frame.rarity} · PROFIILIRAAM</span><div class="detailArt">${avatarArt(currentSkin(), frame)}</div><h2>${frame.name}</h2><p>Raam sobib kõigi sinu skinidega ja ilmub ka edetabelisse.</p>${owned ? `<button class="btn primary" onclick="equipFrame('${id}');closeSheet()">${state.equippedFrame === id ? 'JÄTA SEE RAAM' : 'KASUTA RAAMI'}</button>` : '<p class="lockedHint">Lukus · selle raami võid leida QR-preemiast.</p>'}</div>`);
}
function previewSkin(id) {
  const skin = skins.find(item => item.id === id);
  if (!skin) return;
  const owned = state.skins.includes(id);
  openSheet(`<div class="cosmeticDetail"><span class="tag ${rarityClass(skin.rarity)}">${skin.rarity} · PROFIILISKIN</span><div class="detailArt">${avatarArt(skin, currentFrame())}</div><h2>${skin.name}</h2><p>Vaata uut tegelast koos oma valitud profiiliraamiga.</p>${owned ? `<button class="btn primary" onclick="equipSkin('${id}');closeSheet()">KASUTA SKINI</button>` : '<p class="lockedHint">Lukus · selle skini võid leida QR-preemiast.</p>'}</div>`);
}

document.querySelector('.cosmeticTabs').addEventListener('keydown', event => {
  const tabs = [...document.querySelectorAll('[data-cosmetic-tab]')];
  const index = tabs.indexOf(document.activeElement);
  if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  cosmeticTab(tabs[next].dataset.cosmeticTab);
  tabs[next].focus();
});
