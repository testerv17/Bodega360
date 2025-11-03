// ================== NAV ==================
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

// ================== CATALOGO ==================
const chips = document.getElementById('chips');
const grid  = document.getElementById('catalogGrid');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
let PRODUCTS = [];

async function loadProducts(){
  const res = await fetch('./data/products.json');
  PRODUCTS = await res.json();
  renderChips();
  renderProducts(PRODUCTS);
}
function renderChips(){
  const cats = [...new Set(PRODUCTS.map(p=>p.category))];
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
function setActive(el){ chips.querySelectorAll('.chip').forEach(x=>x.classList.remove('active')); el.classList.add('active'); }
function renderProducts(list){
  grid.innerHTML = '';
  list.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${p.onSale ? '<div class="badge sale">OFERTA</div>' : ''}
      <img src="${p.img}" alt="${p.title}">
      <div class="title">${p.title}</div>
      <div class="meta">
        <span>$${Number(p.price).toLocaleString()}</span>
        <button class="btn btn-ghost">Detalles</button>
      </div>`;
    card.querySelector('button').addEventListener('click', ()=> openProductModal(p));
    grid.appendChild(card);
  });
}
searchBtn.addEventListener('click', ()=>{
  const t = searchInput.value.trim().toLowerCase();
  const filtered = PRODUCTS.filter(p=> (p.title+' '+p.keywords.join(' ')).toLowerCase().includes(t));
  renderProducts(filtered);
});

// ================== VISOR 3D ==================
const modal = document.getElementById('productModal');
const modalClose = document.getElementById('modalClose');
const modalBackdrop = document.getElementById('modalBackdrop');
const viewerCanvas = document.getElementById('viewerCanvas');
const viewerOverlay = document.getElementById('viewerOverlay');
const elTitle = document.getElementById('modalTitle');
const elPrice = document.getElementById('modalPrice');
const elDesc  = document.getElementById('modalDesc');
const elSpecs = document.getElementById('modalSpecs');
let r3d, scn, cam, ctl, cube, currentGltf;

function openProductModal(p){
  elTitle.textContent = p.title;
  elPrice.textContent = '$'+Number(p.price).toLocaleString();
  elDesc.textContent = p.description || 'Producto disponible.';
  elSpecs.innerHTML = '';
  modal.classList.add('is-open');
  initViewer();
  loadModel(p.modelUrl);
}
function closeProductModal(){ modal.classList.remove('is-open'); }
modalClose.addEventListener('click', closeProductModal);
modalBackdrop.addEventListener('click', closeProductModal);

function initViewer(){
  if(r3d) return resizeViewer();
  r3d = new THREE.WebGLRenderer({canvas: viewerCanvas, antialias:true});
  scn = new THREE.Scene(); scn.background = new THREE.Color(0x0b1018);
  cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  cam.position.set(2.5, 2, 3.5);
  ctl = new THREE.OrbitControls(cam, r3d.domElement);
  ctl.enableDamping = true;
  const light = new THREE.DirectionalLight(0xffffff,1.2);
  scn.add(light, new THREE.AmbientLight(0x6680a6,0.6));
  cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0x36a3ff}));
  scn.add(cube);
  animateViewer();
}
function animateViewer(){ requestAnimationFrame(animateViewer); if(cube) cube.rotation.y += 0.01; ctl.update(); r3d.render(scn, cam); }
function resizeViewer(){ const w = viewerCanvas.clientWidth, h = viewerCanvas.clientHeight; r3d.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix(); }
window.addEventListener('resize', resizeViewer);

function loadModel(url){
  viewerOverlay.textContent='Cargando 3D…'; viewerOverlay.style.display='flex';
  const loader = new THREE.GLTFLoader();
  loader.load(url, gltf=>{
    if(currentGltf) scn.remove(currentGltf);
    currentGltf = gltf.scene; scn.add(currentGltf); cube.visible=false;
    viewerOverlay.style.display='none';
  }, undefined, err=>{
    console.error(err); viewerOverlay.textContent='Error al cargar modelo'; setTimeout(()=>viewerOverlay.style.display='none',1500);
  });
}

// ================== CHAT IA (Hugging Face Worker) ==================
const chatModal = document.getElementById('chatModal');
const chatBackdrop = document.getElementById('chatBackdrop');
const chatClose = document.getElementById('chatClose');
const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatBtn = document.getElementById('openPoe');

chatBtn?.addEventListener('click', ()=>{ chatModal.classList.add('is-open'); setTimeout(()=>chatInput.focus(),200); });
chatBackdrop.addEventListener('click', ()=>chatModal.classList.remove('is-open'));
chatClose.addEventListener('click', ()=>chatModal.classList.remove('is-open'));
document.addEventListener('keydown', e=>{ if(e.key==='Escape') chatModal.classList.remove('is-open'); });

function appendBubble(text, who='ai'){
  const wrap=document.createElement('div'); wrap.className='bubble '+who; wrap.textContent=text;
  chatLog.appendChild(wrap); chatLog.scrollTop=chatLog.scrollHeight;
}

chatForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const q=chatInput.value.trim(); if(!q) return;
  appendBubble(q,'user'); chatInput.value='';
  appendBubble('⏳ Pensando...','ai');

  try{
    const resp=await fetch('https://bodega-chat.dgncfemed.workers.dev/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages:[
        {role:'system',content:'Eres un asistente de compras para un catálogo mayorista. Responde en español, breve y claro.'},
        {role:'user',content:q}
      ]})
    });
    const data=await resp.json();
    chatLog.lastElementChild.remove();
    if(!resp.ok){ appendBubble('Error: '+(data?.error?.error||'Servidor ocupado'),'ai'); return; }
    appendBubble(data.reply||'Sin respuesta.','ai');
  }catch(err){
    chatLog.lastElementChild.remove(); appendBubble('⚠️ Error de conexión','ai'); console.error(err);
  }
});

loadProducts();
