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
  try{
    const res = await fetch('./data/products.json?ts=' + Date.now());
    if(!res.ok) throw new Error('No se pudo cargar products.json');
    PRODUCTS = await res.json();
    renderChips();
    renderProducts(PRODUCTS);
  }catch(e){
    console.error(e);
  }
}

function renderChips(){
  const cats = [...new Set(PRODUCTS.map(p=>p.category).filter(Boolean))];
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
    card.className = 'card';
    card.innerHTML = `
      ${p.onSale ? '<div class="badge sale">OFERTA</div>' : ''}
      <img src="${p.img}" alt="${p.title}">
      <div class="title">${p.title}</div>
      <div class="meta">
        <span>$${Number(p.price).toLocaleString()}</span>
        <button class="btn btn-ghost" aria-label="Ver detalles">Detalles</button>
      </div>
    `;
    card.querySelector('button').addEventListener('click', ()=> openProductModal(p));
    grid.appendChild(card);
  });
}

searchBtn.addEventListener('click', ()=>{
  const t = searchInput.value.trim().toLowerCase();
  if(!t) { renderProducts(PRODUCTS); return; }
  const filtered = PRODUCTS.filter(p=>{
    const bag = (p.title+' '+(p.category||'')+' '+(p.keywords||[]).join(' ')).toLowerCase();
    return bag.includes(t);
  });
  renderProducts(filtered);
});

// ================== MODAL + VISOR 3D ==================
const modal = document.getElementById('productModal');
const modalClose = document.getElementById('modalClose');
const modalBackdrop = document.getElementById('modalBackdrop');

const elTitle = document.getElementById('modalTitle');
const elPrice = document.getElementById('modalPrice');
const elDesc  = document.getElementById('modalDesc');
const elSpecs = document.getElementById('modalSpecs');

const viewerCanvas = document.getElementById('viewerCanvas');
const viewerOverlay = document.getElementById('viewerOverlay');
const btnResetCam = document.getElementById('btnResetCam');
const btnFullscreen = document.getElementById('btnFullscreen');

let r3d = null, scn = null, cam = null, ctl = null, cube = null, currentGltf = null;

function openProductModal(p){
  elTitle.textContent = p.title;
  elPrice.textContent = '$' + Number(p.price).toLocaleString();
  elDesc.textContent  = p.description || 'Producto disponible para mayoreo.';
  elSpecs.innerHTML = '';
  if (p.specs) {
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

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');

  initViewer();
  loadModel(p.modelUrl);
  setTimeout(safeResizeViewer, 100);
}

function closeProductModal(){
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden','true');
}
modalClose.addEventListener('click', closeProductModal);
modalBackdrop.addEventListener('click', closeProductModal);
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && modal.classList.contains('is-open')) closeProductModal(); });

function initViewer(){
  if (r3d && scn && cam) return;

  // Verificar que Three esté cargado
  if (typeof THREE === 'undefined') {
    console.error('THREE.js no está cargado.');
    viewerOverlay.textContent = 'Error cargando Three.js';
    return;
  }

  r3d = new THREE.WebGLRenderer({ canvas: viewerCanvas, antialias: true });

  scn = new THREE.Scene();
  scn.background = new THREE.Color(0x0b1018);

  cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  cam.position.set(2.5, 2, 3.5);

  safeResizeViewer();

  ctl = new THREE.OrbitControls(cam, r3d.domElement);
  ctl.enableDamping = true;

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(5,5,5);
  scn.add(light, new THREE.AmbientLight(0x6680a6, 0.6));

  cube = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({ color: 0x36a3ff, metalness: .2, roughness: .4 })
  );
  scn.add(cube);

  animateViewer();
}

function animateViewer(){
  requestAnimationFrame(animateViewer);
  if(cube) cube.rotation.y += 0.01;
  ctl && ctl.update();
  r3d && scn && cam && r3d.render(scn, cam);
}

function safeResizeViewer(){
  if (!r3d || !cam || !viewerCanvas) return;
  const parent = viewerCanvas.parentElement || viewerCanvas;
  const rect = parent.getBoundingClientRect();
  const w = Math.max(1, rect.width || parent.clientWidth || 1);
  const h = Math.max(1, viewerCanvas.clientHeight || Math.round(w * 0.56));
  r3d.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}
window.addEventListener('resize', safeResizeViewer);

function loadModel(url){
  viewerOverlay.textContent = 'Cargando 3D…';
  viewerOverlay.style.display = 'flex';

  if(currentGltf){ scn.remove(currentGltf); currentGltf = null; }
  if(!url || !(url.endsWith('.glb') || url.endsWith('.gltf'))){
    cube && (cube.visible = true);
    viewerOverlay.style.display = 'none';
    return;
  }

  const loader = new THREE.GLTFLoader();
  loader.load(
    url,
    (gltf)=>{
      currentGltf = gltf.scene;
      currentGltf.traverse(n=>{ if(n.isMesh){ n.castShadow = n.receiveShadow = true; } });
      scn.add(currentGltf);
      cube && (cube.visible = false);
      cam.position.set(2.5, 2, 3.5);
      ctl && (ctl.target.set(0,0.6,0), ctl.update());
      viewerOverlay.style.display = 'none';
      setTimeout(safeResizeViewer, 0);
    },
    undefined,
    (err)=>{
      console.error('GLTF error:', err);
      cube && (cube.visible = true);
      viewerOverlay.textContent = 'No se pudo cargar el modelo 3D.';
      setTimeout(()=> viewerOverlay.style.display = 'none', 1500);
    }
  );
}

btnResetCam.addEventListener('click', ()=>{
  cam.position.set(2.5, 2, 3.5);
  ctl && (ctl.target.set(0,0,0), ctl.update());
});
btnFullscreen.addEventListener('click', ()=>{
  if(document.fullscreenElement) document.exitFullscreen?.();
  else viewerCanvas.requestFullscreen?.();
});

// ================== INIT ==================
loadProducts();

