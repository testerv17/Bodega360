// Importa Three y addons usando el import map
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ====== Catálogo ======
const chips = document.getElementById('chips');
const grid  = document.getElementById('catalogGrid');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');

let PRODUCTS = [];

async function loadProducts(){
  const res = await fetch('./data/products.json?ts=' + Date.now());
  PRODUCTS = await res.json();
  renderChips();
  renderProducts(PRODUCTS);
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
    c.className = 'chip'; c.textContent = cat;
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
  if(!t) return renderProducts(PRODUCTS);
  const filtered = PRODUCTS.filter(p=>{
    const bag = (p.title+' '+(p.category||'')+' '+(p.keywords||[]).join(' ')).toLowerCase();
    return bag.includes(t);
  });
  renderProducts(filtered);
});

// ====== Modal + Visor 3D ======
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

let renderer, scene, camera, controls, cube, currentGltf;

function openProductModal(p){
  elTitle.textContent = p.title;
  elPrice.textContent = '$' + Number(p.price).toLocaleString();
  elDesc.textContent  = p.description || 'Producto disponible para mayoreo.';
  elSpecs.innerHTML = '';
  if (p.specs){
    const frag = document.createElement('div');
    Object.entries(p.specs).forEach(([k,v])=>{
      const row = document.createElement('div');
      row.style.display='flex'; row.style.justifyContent='space-between'; row.style.gap='8px'; row.style.fontSize='14px';
      row.innerHTML = `<span style="color:#9fb0c9">${k}</span><strong>${v}</strong>`;
      frag.appendChild(row);
    });
    elSpecs.appendChild(frag);
  }

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');

  viewerOverlay.textContent = 'Cargando 3D…';
  viewerOverlay.style.display = 'flex';

  initViewer();
  loadModel(p.modelUrl);
  setTimeout(resizeViewer, 0);
}

function closeProductModal(){ modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); }
modalClose.addEventListener('click', closeProductModal);
modalBackdrop.addEventListener('click', closeProductModal);
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && modal.classList.contains('is-open')) closeProductModal(); });

function initViewer(){
  if (renderer && scene && camera) return;

  renderer = new THREE.WebGLRenderer({ canvas: viewerCanvas, antialias:true });
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1018);

  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(2.5, 2, 3.5);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const light = new THREE.DirectionalLight(0xffffff, 1.2); light.position.set(5,5,5);
  scene.add(light, new THREE.AmbientLight(0x6680a6, 0.6));

  cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
                        new THREE.MeshStandardMaterial({color:0x36a3ff, metalness:.2, roughness:.4}));
  scene.add(cube);

  resizeViewer();
  animate();
}

function animate(){
  requestAnimationFrame(animate);
  if(cube) cube.rotation.y += 0.01;
  controls && controls.update();
  renderer && scene && camera && renderer.render(scene, camera);
}

function resizeViewer(){
  if (!renderer || !camera) return;
  const parent = viewerCanvas.parentElement || viewerCanvas;
  const rect = parent.getBoundingClientRect();
  const w = Math.max(1, rect.width || parent.clientWidth || 1);
  const h = Math.max(1, viewerCanvas.clientHeight || Math.round(w * 0.56));
  renderer.setSize(w, h, false);
  camera.aspect = w/h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resizeViewer);

function loadModel(url){
  if(currentGltf){ scene.remove(currentGltf); currentGltf = null; }
  if(!url || !(url.endsWith('.glb') || url.endsWith('.gltf'))){
    cube && (cube.visible = true);
    viewerOverlay.style.display = 'none';
    return;
  }

  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf)=>{
      currentGltf = gltf.scene;
      currentGltf.traverse(n=>{ if(n.isMesh){ n.castShadow = n.receiveShadow = true; } });
      scene.add(currentGltf);
      cube && (cube.visible = false);
      camera.position.set(2.5, 2, 3.5);
      controls.target.set(0,0.6,0); controls.update();
      viewerOverlay.style.display = 'none';
      setTimeout(resizeViewer, 0);
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
  if (!camera || !controls) return;
  camera.position.set(2.5, 2, 3.5);
  controls.target.set(0,0,0); controls.update();
});
btnFullscreen.addEventListener('click', ()=>{
  if (!viewerCanvas) return;
  if(document.fullscreenElement) document.exitFullscreen?.();
  else viewerCanvas.requestFullscreen?.();
});

// ================== TOUR VIRTUAL 360° ==================
const tourOpenBtn   = document.getElementById('btnTour');
const tourModal     = document.getElementById('tourModal');
const tourBackdrop  = document.getElementById('tourBackdrop');
const tourClose     = document.getElementById('tourClose');
const tourCanvas    = document.getElementById('tourCanvas');
const tourOverlay   = document.getElementById('tourOverlay');

const tourBtnEntrada = document.getElementById('tourBtnEntrada');
const tourBtnPasillo = document.getElementById('tourBtnPasillo');
const tourBtnZoomIn  = document.getElementById('tourBtnZoomIn');
const tourBtnZoomOut = document.getElementById('tourBtnZoomOut');
const tourBtnFS      = document.getElementById('tourBtnFS');

let tourRenderer = null, tourScene = null, tourCamera = null, tourControls = null, tourMesh = null, tourTex = null;
let tourAnimating = false;

// Panorámicas demo (equirectangulares JPG 2:1). Puedes cambiarlas por tus fotos:
const PANO_ENTRADA = 'https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.jpg';
const PANO_PASILLO = 'https://threejs.org/examples/textures/equirectangular/pedestrian_overpass_1k.jpg';
// Alternativa local (cuando tengas las tuyas):
// const PANO_ENTRADA = 'assets/360/entrada.jpg';
// const PANO_PASILLO = 'assets/360/pasillo.jpg';

tourOpenBtn?.addEventListener('click', ()=> {
  tourModal.classList.add('is-open');
  tourModal.setAttribute('aria-hidden','false');
  initTour();
  loadPano(PANO_ENTRADA);
  setTimeout(resizeTour, 0);
});

tourClose?.addEventListener('click', closeTour);
tourBackdrop?.addEventListener('click', closeTour);
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && tourModal.classList.contains('is-open')) closeTour(); });

function closeTour(){
  tourModal.classList.remove('is-open');
  tourModal.setAttribute('aria-hidden','true');
}

function initTour(){
  if (tourRenderer && tourScene && tourCamera) return;

  // Seguridad: verificar Three.js global
  if (typeof THREE === 'undefined' || !THREE.OrbitControls) {
    console.error('THREE no disponible para el tour.');
    tourOverlay.textContent = 'Error cargando Three.js';
    return;
  }

  tourRenderer = new THREE.WebGLRenderer({ canvas: tourCanvas, antialias: true });
  tourScene    = new THREE.Scene();

  // Cámara con FOV ajustable (zoom con + y −)
  tourCamera   = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
  tourCamera.position.set(0, 0, 0.1);

  tourControls = new THREE.OrbitControls(tourCamera, tourRenderer.domElement);
  tourControls.enableZoom = false;  // manejamos zoom con botones
  tourControls.enablePan = false;
  tourControls.enableDamping = true;

  // Esfera invertida para ver el panorama desde dentro
  const geom   = new THREE.SphereGeometry(500, 60, 40);
  geom.scale(-1, 1, 1); // invertimos la esfera para "estar dentro"
  const mat    = new THREE.MeshBasicMaterial({ color: 0xffffff });
  tourMesh     = new THREE.Mesh(geom, mat);
  tourScene.add(tourMesh);

  resizeTour();
  if (!tourAnimating) { tourAnimating = true; animateTour(); }

  // Botones
  tourBtnEntrada?.addEventListener('click', ()=> loadPano(PANO_ENTRADA));
  tourBtnPasillo?.addEventListener('click', ()=> loadPano(PANO_PASILLO));
  tourBtnZoomIn?.addEventListener('click', ()=> { tourCamera.fov = Math.max(30, tourCamera.fov - 5); tourCamera.updateProjectionMatrix(); });
  tourBtnZoomOut?.addEventListener('click', ()=> { tourCamera.fov = Math.min(100, tourCamera.fov + 5); tourCamera.updateProjectionMatrix(); });
  tourBtnFS?.addEventListener('click', ()=>{
    if(document.fullscreenElement) document.exitFullscreen?.();
    else tourCanvas.requestFullscreen?.();
  });
}

function loadPano(url){
  try {
    tourOverlay.textContent = 'Cargando panorama…';
    tourOverlay.style.display = 'flex';
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(url, (tex)=>{
      tourTex?.dispose?.();
      tourTex = tex;
      tourTex.colorSpace = THREE.SRGBColorSpace; // tonos correctos
      tourMesh.material.map = tourTex;
      tourMesh.material.needsUpdate = true;
      tourOverlay.style.display = 'none';
    }, undefined, (err)=>{
      console.error('Error cargando panorama:', err);
      tourOverlay.textContent = 'No se pudo cargar el panorama.';
      setTimeout(()=> tourOverlay.style.display = 'none', 1500);
    });
  } catch (e) {
    console.error(e);
    tourOverlay.textContent = 'Error.';
    setTimeout(()=> tourOverlay.style.display = 'none', 1500);
  }
}

function animateTour(){
  requestAnimationFrame(animateTour);
  tourControls && tourControls.update();
  tourRenderer && tourScene && tourCamera && tourRenderer.render(tourScene, tourCamera);
}

function resizeTour(){
  if (!tourRenderer || !tourCamera || !tourCanvas) return;
  const parent = tourCanvas.parentElement || tourCanvas;
  const rect = parent.getBoundingClientRect();
  const w = Math.max(1, rect.width || parent.clientWidth || 1);
  const h = Math.max(1, tourCanvas.clientHeight || Math.round(w * 0.56));
  tourRenderer.setSize(w, h, false);
  tourCamera.aspect = w / h;
  tourCamera.updateProjectionMatrix();
}
window.addEventListener('resize', resizeTour);


// ====== INIT ======
loadProducts();
