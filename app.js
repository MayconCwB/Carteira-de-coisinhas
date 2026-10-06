'use strict';
const $ = id => document.getElementById(id);
const CATEGORIES = ['Carteirinha', 'Ingressos', 'Documentos', 'Outros'];
const MAX_SIZE = 30 * 1024 * 1024;
let db, documents = [], filter = 'Todos', current, editing, previewUrl;
let cardUrls = [], toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('minha-carteira', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents', {keyPath:'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Feche outras abas da carteira e tente novamente.'));
  });
}
function transaction(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', mode);
    const request = action(tx.objectStore('documents'));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Operação cancelada.'));
  });
}
async function refresh() { documents = await transaction('readonly', store => store.getAll()); render(); }
function render() {
  cardUrls.forEach(url => URL.revokeObjectURL(url)); cardUrls = [];
  $('cards').replaceChildren(); $('filters').replaceChildren();
  for (const name of ['Todos', 'Favoritos', ...CATEGORIES]) {
    const button = document.createElement('button'); button.textContent = name;
    button.className = filter === name ? 'active' : ''; button.setAttribute('aria-pressed', String(filter === name));
    button.onclick = () => { filter = name; render(); }; $('filters').append(button);
  }
  const query = $('search').value.trim().toLocaleLowerCase('pt-BR');
  const visible = documents.filter(d => (filter === 'Todos' || (filter === 'Favoritos' ? d.favorite : d.category === filter)) && d.title.toLocaleLowerCase('pt-BR').includes(query))
    .sort((a,b) => Number(b.favorite) - Number(a.favorite) || b.created - a.created);
  $('count').textContent = `${documents.length} ${documents.length === 1 ? 'documento salvo' : 'documentos salvos'}`;
  $('empty').hidden = visible.length !== 0;
  $('empty').querySelector('h3').textContent = documents.length ? 'Nada por aqui ainda' : 'Sua carteira começa aqui';
  $('empty').querySelector('p').textContent = documents.length ? 'Experimente outra categoria ou busca.' : 'Guarde uma foto ou PDF e encontre o que precisa em segundos.';
  $('first-add').hidden = documents.length > 0;
  for (const doc of visible) {
    const card = document.createElement('article'); card.className = 'card';
    const open = document.createElement('button'); open.className = 'card-open'; open.setAttribute('aria-label', `Abrir ${doc.title}`);
    const thumb = document.createElement('div'); thumb.className = 'thumbnail';
    if (doc.type.startsWith('image/')) {
      const image = document.createElement('img'); const url = URL.createObjectURL(doc.blob); cardUrls.push(url);
      image.src = url; image.alt = ''; image.loading = 'lazy'; thumb.append(image);
    } else { thumb.textContent = 'PDF'; }
    const body = document.createElement('div'); body.className = 'card-body';
    const title = document.createElement('span'); title.className = 'card-title'; title.textContent = doc.title;
    const category = document.createElement('span'); category.className = 'category'; category.textContent = doc.category;
    body.append(title, category); open.append(thumb, body); open.onclick = () => showDocument(doc);
    const star = document.createElement('button'); star.className = 'favorite'; star.textContent = doc.favorite ? '★' : '☆';
    star.setAttribute('aria-pressed', String(doc.favorite)); star.setAttribute('aria-label', doc.favorite ? 'Remover dos favoritos' : 'Marcar como favorito');
    star.onclick = async () => { try { await transaction('readwrite', store => store.put({...doc, favorite:!doc.favorite})); await refresh(); } catch { toast('Não foi possível salvar o favorito.'); } };
    card.append(open, star); $('cards').append(card);
  }
}
function openEditor(doc) {
  editing = doc || null; $('document-form').reset(); $('form-error').textContent = '';
  $('editor-title').textContent = doc ? 'Editar documento' : 'Novo documento';
  $('title').value = doc?.title || ''; $('category').value = doc?.category || 'Carteirinha';
  $('file-label').hidden = !!doc; $('file-name').textContent = doc ? doc.filename : 'JPG, PNG, HEIC ou PDF · até 30 MB';
  $('file').required = !doc; $('editor').showModal();
}
async function normalizeFile(file) {
  if (!file.size || file.size > MAX_SIZE) throw new Error('Escolha um arquivo de até 30 MB.');
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const header = new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
    if (header !== '%PDF-') throw new Error('Esse arquivo não é um PDF válido.');
    return {blob:new Blob([file], {type:'application/pdf'}), type:'application/pdf', filename:file.name};
  }
  if (!file.type.startsWith('image/') && !/\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file.name)) throw new Error('Escolha uma foto ou PDF.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (!image.naturalWidth) throw new Error('Imagem inválida.');
    // Retain the source image and its original QR pixels when the browser decodes it.
    const type = file.type || 'image/jpeg';
    return {blob:new Blob([file], {type}), type, filename:file.name};
  } catch { throw new Error('O navegador não abriu esta imagem. Tente uma captura de tela em PNG ou JPG.'); }
  finally { URL.revokeObjectURL(url); }
}
$('document-form').onsubmit = async event => {
  event.preventDefault(); $('save').disabled = true; $('form-error').textContent = '';
  try {
    const title = $('title').value.trim(); if (!title) throw new Error('Informe um nome.');
    let doc;
    if (editing) doc = {...editing, title, category:$('category').value};
    else {
      const file = $('file').files[0]; if (!file) throw new Error('Escolha uma foto ou PDF.');
      doc = {id:crypto.randomUUID(), title, category:$('category').value, favorite:false, created:Date.now(), ...await normalizeFile(file)};
    }
    await transaction('readwrite', store => store.put(doc)); await refresh(); $('editor').close(); toast('Documento salvo no aparelho.');
    requestPersistence(false);
  } catch (error) { $('form-error').textContent = error.name === 'QuotaExceededError' ? 'O aparelho está sem espaço para este arquivo.' : error.message; }
  finally { $('save').disabled = false; }
};
$('file').onchange = () => {
  const file = $('file').files[0]; $('file-name').textContent = file ? file.name : 'Nenhum arquivo selecionado';
  if (file && !$('title').value) $('title').value = file.name.replace(/\.[^.]+$/, '').slice(0,100);
};
function showDocument(doc) {
  current = doc; $('view-title').textContent = doc.title; $('view-content').replaceChildren();
  previewUrl = URL.createObjectURL(doc.blob);
  if (doc.type.startsWith('image/')) {
    const surface = document.createElement('div'); surface.className = 'image-surface';
    const image = document.createElement('img'); image.src = previewUrl; image.alt = doc.title;
    surface.append(image); $('view-content').append(surface);
    const zoom = document.createElement('button'); zoom.className = 'secondary'; zoom.textContent = 'Ampliar imagem';
    zoom.onclick = () => { const expanded = surface.classList.toggle('zoom'); zoom.textContent = expanded ? 'Ajustar à tela' : 'Ampliar imagem'; };
    $('view-content').append(zoom);
  } else {
    const frame = document.createElement('iframe'); frame.src = previewUrl; frame.title = doc.title; frame.className = 'pdf-view'; $('view-content').append(frame);
    const link = document.createElement('a'); link.href = previewUrl; link.target = '_blank'; link.rel = 'noopener'; link.className = 'document-link'; link.textContent = 'Abrir PDF no visualizador do iPhone ↗'; $('view-content').append(link);
  }
  $('viewer').showModal();
}
$('viewer').addEventListener('close', () => { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = undefined; $('view-content').replaceChildren(); });
async function exportFile(blob, filename) {
  const file = new File([blob], filename, {type:blob.type});
  if (navigator.canShare?.({files:[file]})) { await navigator.share({files:[file], title:filename}); return; }
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
$('share').onclick = async () => { try { await exportFile(current.blob, current.filename); } catch (error) { if (error.name !== 'AbortError') toast('Não foi possível compartilhar. Tente abrir o arquivo.'); } };
$('edit').onclick = () => { $('viewer').close(); openEditor(current); };
$('delete').onclick = () => $('confirm-delete').showModal();
$('confirm-delete-button').onclick = async () => {
  try { await transaction('readwrite', store => store.delete(current.id)); $('confirm-delete').close(); $('viewer').close(); await refresh(); toast('Documento excluído.'); }
  catch { toast('Não foi possível excluir.'); }
};
function dataURL(blob) { return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }
$('backup').onclick = async () => {
  $('backup').disabled = true;
  try {
    const entries = [];
    for (const doc of documents) { const {blob, ...metadata} = doc; entries.push({...metadata, data:await dataURL(blob)}); }
    const blob = new Blob([JSON.stringify({app:'minha-carteira',version:1,documents:entries})], {type:'application/json'});
    await exportFile(blob, `minha-carteira-${new Date().toISOString().slice(0,10)}.json`);
  } catch (error) { if (error.name !== 'AbortError') toast('Não foi possível exportar a cópia.'); }
  finally { $('backup').disabled = false; }
};
$('restore').onchange = async () => {
  const file = $('restore').files[0]; if (!file) return;
  try {
    if (file.size > 200 * 1024 * 1024) throw new Error('A cópia é grande demais. O limite é 200 MB.');
    const backup = JSON.parse(await file.text());
    if (backup.app !== 'minha-carteira' || backup.version !== 1 || !Array.isArray(backup.documents) || backup.documents.length > 500) throw new Error('Cópia de segurança inválida.');
    const restored = [];
    for (const doc of backup.documents) {
      if (typeof doc.id !== 'string' || doc.id.length > 100 || typeof doc.title !== 'string' || !doc.title.trim() || doc.title.length > 100 || !CATEGORIES.includes(doc.category) || !Number.isFinite(doc.created) || typeof doc.filename !== 'string' || doc.filename.length > 255 || typeof doc.data !== 'string') throw new Error('Documento inválido na cópia.');
      const match = /^data:(image\/[a-zA-Z0-9.+-]+|application\/pdf);base64,([A-Za-z0-9+/=]+)$/.exec(doc.data);
      if (!match) throw new Error('Arquivo inválido na cópia.');
      const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
      const file = new File([bytes], doc.filename, {type:match[1]});
      const normalized = await normalizeFile(file);
      restored.push({id:doc.id,title:doc.title,category:doc.category,created:doc.created,favorite:!!doc.favorite,...normalized});
    }
    // One transaction: an invalid backup or quota failure never causes a partial restore.
    await transaction('readwrite', store => { for (const doc of restored) store.put(doc); });
    await refresh(); toast(`${restored.length} documentos restaurados.`);
  } catch (error) { toast(error.message || 'Não foi possível restaurar.'); }
  finally { $('restore').value = ''; }
};
async function requestPersistence(showStatus) {
  let text = 'Este navegador não oferece proteção extra. Mantenha uma cópia de segurança.';
  try { if (navigator.storage?.persist) text = await navigator.storage.persist() ? 'O navegador concedeu proteção extra. Mantenha uma cópia de segurança.' : 'Proteção extra não concedida. Use o ícone da tela inicial e mantenha uma cópia.'; } catch {}
  if (showStatus) $('storage-status').textContent = text;
}
$('persist').onclick = () => requestPersistence(true);
$('add').onclick = $('first-add').onclick = () => openEditor();
$('settings').onclick = () => $('preferences').showModal();
$('search').oninput = render;
document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) $('install-tip').hidden = true;
async function start() {
  try { db = await openDB(); await refresh(); }
  catch { $('count').textContent = 'Armazenamento indisponível'; $('add').disabled = true; toast('Não foi possível abrir o armazenamento. Saia da navegação privada e tente novamente.'); }
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js'); await navigator.serviceWorker.ready; }
    catch { toast('Modo offline indisponível. Reabra com internet para tentar novamente.'); }
  }
}
start();
