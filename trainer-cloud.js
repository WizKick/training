(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const form = el('cloud-login'), actions = el('cloud-actions'), list = el('cloud-list');
  let config, session, busy = false;
  const bucket = 'trainer-backups';
  function status(text) { el('cloud-status').textContent = text; }
  function signOut() {
    session = null;
    list.replaceChildren();
    form.hidden = false; form.style.display = '';
    actions.hidden = true;
  }
  async function run(task) {
    if (busy) return;
    busy = true;
    const controls = [...el('online-backup').querySelectorAll('input,button,select')];
    controls.forEach(b => b.disabled = true);
    try { await task(); } catch (err) { status(navigator.onLine ? err.message : 'Hors ligne. Tes données restent sur cet appareil.'); }
    finally { busy = false; controls.forEach(b => b.disabled = false); }
  }
  async function request(path, init = {}) {
    const response = await fetch(config.url + path, {...init, cache:'no-store', headers:{
      apikey:config.key, ...(session ? {Authorization:'Bearer '+session.access_token} : {}), ...init.headers
    }});
    if (!response.ok) {
      if (response.status === 401 && session) { signOut(); throw Error('Session expirée. Reconnecte-toi.'); }
      const error = await response.json().catch(() => ({}));
      throw Error(error.message || error.error_description || 'Requête refusée ('+response.status+').');
    }
    return response;
  }
  const json = body => ({method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  async function versions() {
    const result = await request('/storage/v1/object/list/'+bucket, json({prefix:session.user.id,limit:30,sortBy:{column:'name',order:'desc'}}));
    list.replaceChildren();
    for (const item of await result.json()) {
      if (!/^\d{13}-[a-f0-9-]+\.json$/.test(item.name)) continue;
      list.add(new Option(new Date(Number(item.name.slice(0,13))).toLocaleString('fr-FR'),item.name));
    }
  }
  form.onsubmit = event => {
    event.preventDefault();
    run(async () => {
      status('Connexion…');
      const cfg = await fetch('/api/trainer-config',{cache:'no-store'});
      if (!cfg.ok || !cfg.headers.get('content-type')?.includes('application/json')) throw Error('Cloud à configurer dans le projet Vercel.');
      config = await cfg.json(); config.url = config.url.replace(/\/$/,'');
      const pwd = form.querySelector('[type=password]');
      const result = await request('/auth/v1/token?grant_type=password',json({email:form.querySelector('[type=email]').value.trim(),password:pwd.value}));
      session = await result.json(); pwd.value = '';
      form.hidden = true; form.style.display = 'none'; actions.hidden = false;
      await versions(); status(list.length ? 'Choisis une copie ou sauvegarde cet appareil.' : 'Connecté. Tu peux créer ta première sauvegarde.');
    });
  };
  el('cloud-refresh').onclick = () => run(async () => { await versions(); status(list.length+' copie(s) affichée(s).'); });
  el('cloud-save').onclick = () => run(async () => {
    status('Préparation des séances, de la nutrition et des photos…');
    const data = await window.sbtCloudSnapshot();
    const blob = new Blob([JSON.stringify(data)],{type:'application/json'});
    if (blob.size > 50000000) throw Error('La copie dépasse 50 Mo. Utilise la sauvegarde fichier.');
    const name = Date.now()+'-'+crypto.randomUUID()+'.json';
    await request('/storage/v1/object/'+bucket+'/'+session.user.id+'/'+name,{method:'POST',headers:{'Content-Type':'application/json','x-upsert':'false'},body:blob});
    status('Copie enregistrée.'); await versions();
  });
  el('cloud-load').onclick = () => run(async () => {
    if (!list.value) throw Error('Aucune sauvegarde sélectionnée.');
    status('Téléchargement…');
    const response = await request('/storage/v1/object/authenticated/'+bucket+'/'+session.user.id+'/'+list.value);
    const blob = await response.blob();
    window.sbtPickRestore(new File([blob],list.selectedOptions[0].text+'.json',{type:'application/json'}));
    status('Vérifie le résumé dans la rubrique de restauration avant de confirmer.');
    el('import-preview').scrollIntoView({block:'center'});
  });
  el('cloud-out').onclick = () => run(async () => {
    try { await request('/auth/v1/logout?scope=local',{method:'POST'}); }
    finally { signOut(); status('Déconnecté.'); }
  });
})();