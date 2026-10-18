// Original QRändurid portraits and transparent profile ornaments.
const skinNames = {"s1": "Linnaseikleja", "s2": "Kalamaja rebane", "s3": "Sadama kapten", "s4": "Öötiib", "s5": "Neoonninja", "s6": "Pirita merineid", "s7": "Retrokass", "s8": "Vanalinna vaim", "s9": "Küberrändur", "s10": "Kuldne lõvi", "s11": "Pilooditüdruk", "s12": "Metsavaht", "s13": "Päikeseskeitija", "s14": "Süvamere sukelduja", "s15": "Tänavakunstnik", "s16": "Virmaliste hirv", "s17": "Pikselrüütel", "s18": "Päikesesamurai", "s19": "Glitch-meduus", "s20": "Kuumaag", "s21": "Kristallgolem", "s22": "Tallinna draakon", "s23": "Kosmosekülaline", "s24": "Põhjala valküür", "s25": "Fox Runner", "s26": "Bassline", "s27": "Rooftop Cat", "s28": "Shard Alchemist", "s29": "Baltic Dragon", "s30": "Orbit Nomad", "s31": "NULL Shadow", "s32": "Sunflare"};
const frames = [{"id": "f1", "name": "Neoonring", "rarity": "COMMON", "color": "#b5a0ff", "collection": "street"}, {"id": "f2", "name": "Metsik aed", "rarity": "COMMON", "color": "#9edb9c", "collection": "fantasy"}, {"id": "f3", "name": "Arkaad", "rarity": "COMMON", "color": "#f6b4ce", "collection": "street"}, {"id": "f4", "name": "Jäälill", "rarity": "RARE", "color": "#b9efff", "collection": "fantasy"}, {"id": "f5", "name": "Korallilaht", "rarity": "RARE", "color": "#f9acaa", "collection": "fantasy"}, {"id": "f6", "name": "Kuuorbiit", "rarity": "RARE", "color": "#cbc7ff", "collection": "cyber"}, {"id": "f7", "name": "Varjuroos", "rarity": "EPIC", "color": "#e39bbd", "collection": "fantasy"}, {"id": "f8", "name": "Tormisüda", "rarity": "EPIC", "color": "#a4d6ff", "collection": "street"}, {"id": "f9", "name": "Tähekaart", "rarity": "EPIC", "color": "#d6a8ff", "collection": "cyber"}, {"id": "f10", "name": "Draakonivalve", "rarity": "LEGENDARY", "color": "#f6bf82", "collection": "fantasy"}, {"id": "f11", "name": "Päikesekroon", "rarity": "LEGENDARY", "color": "#ffe4a1", "collection": "street"}, {"id": "f12", "name": "Fööniksileek", "rarity": "LEGENDARY", "color": "#ffb084", "collection": "fantasy"}, {"name": "Signaal", "rarity": "RARE", "color": "#63f6f4", "collection": "cyber", "unlock": {"visits": 3}, "id": "f13"}, {"name": "Skateteip", "rarity": "COMMON", "color": "#f4c17c", "collection": "street", "unlock": {"visits": 1}, "id": "f14"}, {"name": "Bassilaine", "rarity": "RARE", "color": "#c4a0ff", "collection": "street", "id": "f15"}, {"name": "Acid Splash", "rarity": "EPIC", "color": "#baff75", "collection": "cyber", "id": "f16"}, {"name": "Sakura Drift", "rarity": "RARE", "color": "#ffc1dc", "collection": "fantasy", "id": "f17"}, {"name": "Runelukk", "rarity": "EPIC", "color": "#a4dbff", "collection": "fantasy", "unlock": {"visits": 5}, "id": "f18"}, {"name": "Portaal", "rarity": "LEGENDARY", "color": "#c4a5ff", "collection": "cyber", "unlock": {"visits": 10}, "id": "f19"}, {"name": "Kiirusjoon", "rarity": "COMMON", "color": "#a8d5ff", "collection": "street", "id": "f20"}, {"name": "Glitch.exe", "rarity": "EPIC", "color": "#8dece4", "collection": "cyber", "id": "f21"}, {"name": "Paberlohe", "rarity": "RARE", "color": "#f7c7b1", "collection": "fantasy", "id": "f22"}, {"name": "Linnalegend", "rarity": "LEGENDARY", "color": "#ffdd97", "collection": "street", "unlock": {"visits": 25}, "id": "f23"}, {"name": "NULL / SECRET", "rarity": "SECRET", "color": "#ffffff", "collection": "cyber", "unlock": {"place": "tammsaare"}, "id": "f24"}];
// The single atlas contains 16 original portraits on an equal 4x4 grid.
const portraitIds = ['s1','s5','s11','s13','s15','s17','s18','s20','s25','s26','s27','s28','s29','s30','s31','s32'];
const extraSkins = [{"id": "s25", "name": "Fox Runner", "rarity": "RARE", "collection": "street", "unlock": {"visits": 3}}, {"id": "s26", "name": "Bassline", "rarity": "RARE", "collection": "street"}, {"id": "s27", "name": "Rooftop Cat", "rarity": "EPIC", "collection": "street", "unlock": {"visits": 5}}, {"id": "s28", "name": "Shard Alchemist", "rarity": "EPIC", "collection": "fantasy"}, {"id": "s29", "name": "Baltic Dragon", "rarity": "EPIC", "collection": "fantasy", "unlock": {"visits": 10}}, {"id": "s30", "name": "Orbit Nomad", "rarity": "LEGENDARY", "collection": "cyber"}, {"id": "s31", "name": "NULL Shadow", "rarity": "SECRET", "collection": "cyber", "unlock": {"place": "tammsaare"}}, {"id": "s32", "name": "Sunflare", "rarity": "LEGENDARY", "collection": "fantasy", "unlock": {"visits": 25}}];
const wardrobe = { collection: 'all', ownedOnly: false };
function skinArt(skin) {
  const id = skinNames[skin?.id] ? skin.id : 's1';
  const tile = portraitIds.indexOf(id);
  if (tile >= 0) return `<span class="skinArt portraitSprite" aria-hidden="true" style="background-position:${(tile%4)/3*100}% ${Math.floor(tile/4)/3*100}%"></span>`;
  return `<img class="skinArt" src="art/${id}.svg" alt="" aria-hidden="true" width="160" height="160">`;
}
function unlockHint(item) {
  return item.unlock?.place ? 'Külasta Tammsaare parki'
    : item.unlock?.visits ? `${Math.min(state.claimed.length,item.unlock.visits)} / ${item.unlock.visits} külastust`
    : 'Ava QR-preemiaga';
}
function matchesWardrobe(item, ownedIds, query, rarity) {
  return matchesCatalog(item,query,rarity) && (wardrobe.collection==='all'||item.collection===wardrobe.collection)
    && (!wardrobe.ownedOnly||ownedIds.includes(item.id));
}
function setWardrobeCollection(collection) {
  wardrobe.collection=collection;
  document.querySelectorAll('[data-collection]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.collection===collection)));
  renderSkins();renderFrames();
}
function toggleOwnedOnly(checked) { wardrobe.ownedOnly=checked;renderSkins();renderFrames(); }
function awardVisitCosmetics(progress=state) {
  const awarded=[];
  for (const [type,catalog,key] of [['skin',skins,'skins'],['frame',frames,'frames']]) {
    for (const item of catalog) {
      const goal=item.unlock;
      if (!goal||progress[key].includes(item.id)) continue;
      if ((goal.place&&progress.claimed.includes(goal.place))||(goal.visits&&progress.claimed.length>=goal.visits)) {
        progress[key].push(item.id);awarded.push({type,item});
      }
    }
  }
  return awarded;
}
function renderStyleGoals() {
  const goals=[
    {visits:1,name:'Esimene päris peatus',skin:null,frame:'f14'},
    {visits:3,name:'Street starter',skin:'s25',frame:'f13'},
    {visits:5,name:'Katuste rada',skin:'s27',frame:'f18'},
    {visits:10,name:'Linnast kaugemale',skin:'s29',frame:'f19'},
    {visits:25,name:'Tallinna oma',skin:'s32',frame:'f23'},
    {place:'tammsaare',name:'NULL / SECRET',skin:'s31',frame:'f24'}
  ];
  const complete=g=>g.place?state.claimed.includes(g.place):state.claimed.length>=g.visits;
  const next=goals.find(g=>!complete(g));
  document.getElementById('styleGoalCount').textContent=`${goals.filter(complete).length} / ${goals.length}`;
  document.getElementById('styleGoalNext').textContent=next?`${next.place?'Külasta Tammsaare parki':`Veel ${Math.max(0,next.visits-state.claimed.length)} ${next.visits-state.claimed.length===1?'külastus':'külastust'} järgmise stiilini`}`:'Kõik stiilieesmärgid täidetud!';
  document.getElementById('styleGoalsGrid').innerHTML=goals.map(g=>{
    const skin=skins.find(s=>s.id===g.skin)||currentSkin(),frame=frames.find(f=>f.id===g.frame),done=complete(g);
    const amount=g.place?(done?1:0):Math.min(state.claimed.length,g.visits),total=g.visits||1;
    return `<article class="styleGoal ${done?'complete':''}"><span class="goalArt">${avatarArt(skin,frame)}</span><div><small>${done?'AVATUD ✓':g.place?'SECRET ASUKOHT':`${g.visits} ${g.visits===1?'KÜLASTUS':'KÜLASTUST'}`}</small><h4>${g.name}</h4><p>${g.skin?skin.name+' + ':''}${frame.name}</p><div class="goalProgress"><span style="width:${amount/total*100}%"></span></div></div></article>`;
  }).join('');
}
function renderSkinCatalog() {
  document.getElementById('skinsCount').textContent=`${state.skins.length}/${skins.length}`;
  const list=skins.filter(s=>matchesWardrobe(s,state.skins,document.getElementById('skinSearch').value,document.getElementById('skinRarity').value));
  list.sort((a,b)=>Number(Number(b.id.slice(1))>24)-Number(Number(a.id.slice(1))>24));
  document.getElementById('skinsGrid').innerHTML=list.map(s=>{
    const owned=state.skins.includes(s.id),selected=state.equippedSkin===s.id;
    return `<button class="collectible skinCard ${rarityClass(s.rarity)} ${owned?'':'locked'} ${selected?'equipped':''}" onclick="previewSkin('${s.id}')" aria-pressed="${selected}" aria-label="${s.name}${owned?'':' — lukus'}"><span class="skinPreview">${skinArt(s)}<span class="skinSerial">${Number(s.id.slice(1))>24?'UUS / ':''}NO. ${s.id.slice(1).padStart(2,'0')}</span><span class="collectionLabel">${s.collection}</span></span><span class="tag ${rarityClass(s.rarity)}">${s.rarity}</span><h3>${s.name}</h3><p>${selected?'Sinu profiilil':owned?'Olemas · vaata ja vali':unlockHint(s)}</p></button>`;
  }).join('')||'<p class="emptyState">Sellist skini ei leitud. Proovi teist filtrit.</p>';
}
function currentFrame() { return frames.find(frame => frame.id === state.equippedFrame) || null; }
function avatarArt(skin, frame = null) {
  return `<span class="avatarStage ${frame ? 'hasFrame frame-'+frame.id+' frame-'+rarityClass(frame.rarity) : ''}">${skinArt(skin)}${frame ? `<img class="frameArt" src="art/${frame.id}.svg" alt="" aria-hidden="true" width="160" height="160">` : ''}</span>`;
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
  const list = frames.filter(frame => matchesWardrobe(frame,state.frames,query,rarity));
  list.sort((a,b)=>Number(Number(b.id.slice(1))>12)-Number(Number(a.id.slice(1))>12));
  document.getElementById('framesGrid').innerHTML = list.map(frame => {
    const owned = state.frames.includes(frame.id), selected = state.equippedFrame === frame.id;
    return `<button class="collectible frameCard ${rarityClass(frame.rarity)} ${selected ? 'equipped' : ''}" onclick="previewFrame('${frame.id}')" aria-label="${frame.name}${owned ? '' : ' — lukus'}" style="--frame-accent:${frame.color}"><span class="framePreview">${avatarArt(currentSkin(), frame)}</span><span class="tag ${rarityClass(frame.rarity)}">${frame.rarity}</span>${frame.unlock?'<span class="goalLabel">TEENI KÜLASTUSTEGA</span>':''}<h3>${frame.name}</h3><p>${selected ? 'Sinu profiilil' : owned ? 'Olemas · vaata ja vali' : unlockHint(frame)}</p></button>`;
  }).join('') || '<p class="emptyState">Sellist raami ei leitud.</p>';
  document.getElementById('cosmeticTotals').textContent=`${skins.length} skini · ${frames.length} raami`;
  renderStyleGoals();
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
  openSheet(`<div class="cosmeticDetail"><span class="tag ${rarityClass(frame.rarity)}">${frame.rarity} · PROFIILIRAAM</span><div class="detailArt">${avatarArt(currentSkin(), frame)}</div><h2>${frame.name}</h2><p>Raam sobib kõigi sinu skinidega ja ilmub ka edetabelisse.</p>${owned ? `<button class="btn primary" onclick="equipFrame('${id}');closeSheet()">${state.equippedFrame === id ? 'JÄTA SEE RAAM' : 'KASUTA RAAMI'}</button>` : `<p class="lockedHint">${unlockHint(frame)}${frame.unlock?' · ese avaneb automaatselt.':''}</p>`}</div>`);
}
function previewSkin(id) {
  const skin = skins.find(item => item.id === id);
  if (!skin) return;
  const owned = state.skins.includes(id);
  openSheet(`<div class="cosmeticDetail"><span class="tag ${rarityClass(skin.rarity)}">${skin.rarity} · PROFIILISKIN</span><div class="detailArt">${avatarArt(skin, currentFrame())}</div><h2>${skin.name}</h2><p>Vaata uut tegelast koos oma valitud profiiliraamiga.</p>${owned ? `<button class="btn primary" onclick="equipSkin('${id}');closeSheet()">KASUTA SKINI</button>` : `<p class="lockedHint">${unlockHint(skin)}${skin.unlock?' · ese avaneb automaatselt.':''}</p>`}</div>`);
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
