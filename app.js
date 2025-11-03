// --- IMPORTS (ESM) ---
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ================== NAV / HAMBURGER ==================
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
hamburger?.addEventListener('click', ()=>{
  const open = navMenu.style.display === 'block';
  navMenu.style.display = open ? 'none' : 'block';
  hamburger.setAttribute('aria-expanded', String(!open));
});
navMenu?.querySelectorAll('a').forEach(a=>a.addEventListener('click', ()=>{
  if(window.innerWidth <= 920){
    navMenu.style.display = 'none';
    hamburger.setAttribute('aria-expanded','false');
  }
}));

// ================== UTILS ==================
function attachTilt(el){
  const c = el.querySelector('.tilt-content') || el;
  el.addEventListener('mousemove', (e)=>{
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left)/r.width - .5;
    const dy = (e.clientY - r.top)/r.height - .5;
    c.style.transform = `rotateX(${(-dy*8)}deg) rotateY(${dx*10}deg)`;
  });
  el.addEventListener('mouseleave', ()=> c.style.transform = 'rotateX(0) rotateY(0)');
}

// ================== DATA / CATALOGO ==================
const chips = document.getElementById('chips');
const grid  = document.getElementById('catalogGrid');
const searchBtn = document.getElementById('searchBtn');
const voiceBtn = document.getElementById('voiceBtn');
const searchInput = document.getElementById('searchInput');

let PRODUCTS = [];

async function loadProducts(){
  const res = await fetch('./data/products.json?ts=' + Date.now());
  if (!res.ok) {
    console.error('No se pudo cargar data/products.json', res.status);
    return;
  }
  PRODUCTS = await res.json();
  renderChips();
  renderProducts(PRODUCTS);
}
function renderChips(){
  const cats = [...new Set(PRODUCTS.map(p=>p.category).filter(Boolean))].slice(0,12);
  chips.innerHTML = '';
  const all = document.createElement('span');
  all.className = 'chip active';
  all.textContent = 'Todos';
  all.addEventListener('click', ()=>{ setActive(all); renderProducts(PRODUCTS); });
  chips.appendChild(all);

  cats.forEach(cat=>{
    const c = document.createElement('span');
    c.className = 'chip';
    c.textContent = cat;
    c.addEventListener('click', ()=>{ setActive(c); renderProducts(PRODUCTS.filter(p=>p.category===cat)); });
    chips.appendChild(c);
  });
}
function setActive(el){
  chips.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
}
function renderProducts(list){
  grid.innerHTML = '';
  list.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'card tilt';
    card.innerHTML = `
      ${p.onSale ? '<div class="badge sale">OFERTA</div>' : ''}
      <div class="tilt-wrap"><div class="tilt-content">
        <img src="${p.img}" alt="${p.title}">
      </div></div>
      <div class="title">${p.title}</div>
      <div class="meta">
        <span>$${Number(p.price).toLocaleString()}</span>
        <button class="btn btn-ghost" aria-label="Ver detalles">Detalles</button>
      </div>
    `;
    card.querySelector('button').addEventListener('click', ()=> openProductModal(p));
    attachTilt(card);
    grid.appendChild(card);
  });
}

// ================== BÚSQUEDA ==================
searchBtn.addEventListener('click', ()=>{
  const t = searchInput.value.trim().toLowerCase();
  const filtered = PRODUCTS.filter(p=>{
    const bag = (p.title+' '+(p.category||'')+' '+(p.keywords||[]).join(' ')).toLowerCase();
    return bag.includes(t);
  });
  renderProducts(filtered);
});
voiceBtn.addEventListener('click', ()=>{
  if(!('webkitSpeechRecognition' in window)){
    alert('Tu navegador no soporta búsqueda por voz.'); return;
  }
  const rec = new webkitSpeechRecognition();
  rec.lang = 'es-MX';
  rec.onresult = (ev)=>{
    const txt = ev.results[0][0].transcript;
    searchInput.value = txt;
    const t = txt.trim().toLowerCase();
    const filtered = PRODUCTS.filter(p=>{
      const bag = (p.title+' '+(p.category||'')+' '+(p.keywords||[]).join(' ')).toLowerCase();
      return bag.includes(t);
    });
    renderProducts(filtered);
  };
  rec.start();
});

// ================== MODAL + VISOR 3D ==================
const modal = document.getElementById('productModal');
const modalClose = document.getElementById('modalClose');
const modalBackdrop = document.getElementById('modalBackdrop');

const elTitle = document.getElementById('modalTitle');
const elBadge = document.getElementById('modalBadge');
const elPrice = document.getElementById('modalPrice');
const elDesc  = document.getElementById('modalDesc');
const elGallery = document.getElementById('modalGallery');
const elChips = document.getElementById('modalChips');
const elSpecs = document.getElementById('modalSpecs');

const viewerCanvas = document.getElementById('viewerCanvas');
const viewerOverlay = document.getElementById('viewerOverlay');
const btnResetCam = document.getElementById('btnResetCam');
const btnFullscreen = document.getElementById('btnFullscreen');

let r3d, scn, cam, ctl, cube, currentGltf;

function openProductModal(p){
  elTitle.textContent = p.title;
  elPrice.textContent = '$' + Number(p.price).toLocaleString();
  elDesc.textContent  = p.description || 'Producto disponible para mayoreo.';
  elBadge.style.display = p.onSale ? 'inline-block' : 'none';

  elChips.innerHTML = '';
  (p.keywords || []).forEach(k=>{
    const span = document.createElement('span');
    span.className = 'chip';
    span.textContent = k;
    elChips.appendChild(span);
  });

  elSpecs.innerHTML = '';
  if(p.specs){
    const frag = document.createElement('div');
    Object.entries(p.specs).forEach(([k,v])=>{
      const row = document.createElement('div');
      row.style.display='flex'; row.style.justifyContent='space-between';
      row.style.gap='8px'; row.style.fontSize='14px';
      row.innerHTML = `<span style="color:#9fb0c9">${k}</span><strong>${v}</strong>`;
      frag.appendChild(row);
    });
    elSpecs.appendChild(frag);
  }

  elGallery.innerHTML = '';
  const imgs = [p.img, ...(p.images || [])].filter(Boolean);
  imgs.forEach(src=>{
    const img = document.createElement('img');
    img.src = src; img.alt = p.title;
    elGallery.appendChild(img);
  });

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');

  initViewer();
  loadModel(p.modelUrl);
  setTimeout(resizeViewer, 0);
}

function closeProductModal(){
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden','true');
  if(currentGltf){ scn.remove(currentGltf); currentGltf = null; }
  if(cube){ cube.visible = true; }
}
modalClose.addEventListener('click', closeProductModal);
modalBackdrop.addEventListener('click', closeProductModal);
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && modal.classList.contains('is-open')) closeProductModal(); });

function initViewer(){
  if (r3d && cam && scn) { resizeViewer(); return; }

  r3d = new THREE.WebGLRenderer({ canvas: viewerCanvas, antialias: true });

  scn = new THREE.Scene();
  scn.background = new THREE.Color(0x0b1018);

  cam = new THREE.PerspectiveCamera(
    60,
    Math.max(1, viewerCanvas.clientWidth) / Math.max(1, viewerCanvas.clientHeight || 1),
    0.1,
    100
  );
  cam.position.set(2.5, 2, 3.5);

  resizeViewer();

  ctl = new OrbitControls(cam, r3d.domElement);
  ctl.enableDamping = true;

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(5, 5, 5);
  scn.add(key, new THREE.AmbientLight(0x6680a6, 0.6));

  const geo = new THREE.BoxGeometry(1,1,1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x36a3ff, metalness: 0.2, roughness: 0.4 });
  cube = new THREE.Mesh(geo, mat);
  scn.add(cube);

  animateViewer();
}
function animateViewer(){
  requestAnimationFrame(animateViewer);
  if(cube) cube.rotation.y += 0.008;
  ctl && ctl.update();
  r3d && scn && cam && r3d.render(scn, cam);
}
function resizeViewer(){
  if (!r3d || !cam || !viewerCanvas) return;
  const parent = viewerCanvas.parentElement || viewerCanvas;
  const w = Math.max(1, parent.clientWidth || 1);
  const h = Math.max(1, viewerCanvas.clientHeight || Math.round(window.innerWidth * 0.56) || 300);
  r3d.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}
window.addEventListener('resize', resizeViewer);

function loadModel(url){
  viewerOverlay.textContent = 'Cargando 3D…';
  viewerOverlay.style.display = 'flex';

  if(currentGltf){ scn.remove(currentGltf); currentGltf = null; }
  if(!url || !(url.endsWith('.glb') || url.endsWith('.gltf'))){
    cube.visible = true;
    viewerOverlay.style.display = 'none';
    return;
  }

  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf)=>{
      currentGltf = gltf.scene;
      currentGltf.traverse(n=>{ if(n.isMesh){ n.castShadow = n.receiveShadow = true; } });
      scn.add(currentGltf);
      cube.visible = false;
      cam.position.set(2.5, 2, 3.5);
      ctl.target.set(0, 0.6, 0);
      ctl.update();
      viewerOverlay.style.display = 'none';
    },
    undefined,
    (err)=>{
      console.error('GLTF error:', err);
      cube.visible = true;
      viewerOverlay.textContent = 'No se pudo cargar el modelo 3D.';
      setTimeout(()=> viewerOverlay.style.display = 'none', 1600);
    }
  );
}

btnResetCam.addEventListener('click', ()=>{
  cam.position.set(2.5, 2, 3.5);
  ctl.target.set(0,0,0); ctl.update();
});
btnFullscreen.addEventListener('click', ()=>{
  if(document.fullscreenElement){ document.exitFullscreen?.(); }
  else { viewerCanvas.requestFullscreen?.(); }
});

// ================== CHAT IA EMBEBIDO (HUGGING FACE vía Worker) ==================
const chatModal = document.getElementById('chatModal');
const chatBackdrop = document.getElementById('chatBackdrop');
const chatClose = document.getElementById('chatClose');
const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

document.getElementById('openPoe').addEventListener('click', ()=>{
  chatModal.classList.add('is-open');
  chatModal.setAttribute('aria-hidden','false');
  setTimeout(()=> chatInput?.focus(), 0);
});
function closeChat(){ chatModal.classList.remove('is-open'); chatModal.setAttribute('aria-hidden','true'); }
chatBackdrop.addEventListener('click', closeChat);
chatClose.addEventListener('click', closeChat);
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && chatModal.classList.contains('is-open')) closeChat(); });

const chatMessages = [
  { role: 'system', content: 'Eres un asistente de compras para un mayorista. Responde en español, breve y claro. Si piden combos/ofertas, sugiere paquetes al mayoreo.' }
];

function appendBubble(text, who='ai'){
  const wrap = document.createElement('div');
  wrap.style.margin = '8px 0';
  wrap.style.display = 'flex';
  wrap.style.justifyContent = who==='user' ? 'flex-end' : 'flex-start';
  const b = document.createElement('div');
  b.style.maxWidth = '80%';
  b.style.padding = '10px 12px';
  b.style.borderRadius = '12px';
  b.style.whiteSpace = 'pre-wrap';
  b.style.border = '1px solid #1b2a42';
  b.style.background = who==='user' ? '#101a2a' : '#0e1420';
  b.textContent = text;
  wrap.appendChild(b);
  chatLog.appendChild(wrap);
  chatLog.scrollTop = chatLog.scrollHeight;
}

chatForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const q = chatInput.value.trim();
  if(!q) return;
  appendBubble(q, 'user');
  chatInput.value = '';

  try{
    const resp = await fetch('https://bodega-chat.dgncfemed.workers.dev/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ messages: [...chatMessages, { role:'user', content:q }] })
    });

    const text = await resp.text();
    let data = null; try { data = JSON.parse(text); } catch {}

    if(!resp.ok){
      console.error('Chat error →', text);
      const m = data?.error?.error?.message || data?.error || 'Servidor ocupado. Intenta de nuevo.';
      appendBubble(m, 'ai');
      return;
    }

    const answer = data?.reply || '…';
    chatMessages.push({ role:'user', content:q }, { role:'assistant', content:answer });
    appendBubble(answer, 'ai');
  }catch(err){
    console.error(err);
    appendBubble('No se pudo conectar al servicio de IA.', 'ai');
  }
});

// ================== INIT ==================
loadProducts();
