let CONFIG = { poe_chat_url: "" };
async function loadConfig(){ try{ const r = await fetch('./data/config.json'); CONFIG = await r.json(); }catch(_){ CONFIG = { poe_chat_url: "" }; } }
loadConfig();

const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
hamburger?.addEventListener('click', ()=>{
  const open = navMenu.style.display === 'block';
  navMenu.style.display = open ? 'none' : 'block';
  hamburger.setAttribute('aria-expanded', String(!open));
});
navMenu?.querySelectorAll('a').forEach(a=>a.addEventListener('click', ()=>{
  if(window.innerWidth <= 920){ navMenu.style.display = 'none'; hamburger.setAttribute('aria-expanded','false'); }
}));

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
document.querySelectorAll('.tilt').forEach(attachTilt);

const chips = document.getElementById('chips');
const grid = document.getElementById('catalogGrid');
let PRODUCTS = [];
async function loadProducts(){
  const res = await fetch('./data/products.json');
  PRODUCTS = await res.json();
  renderChips();
  renderProducts(PRODUCTS);
}
function renderChips(){
  const cats = [...new Set(PRODUCTS.map(p=>p.category).filter(Boolean))].slice(0,12);
  chips.innerHTML = '';
  const all = document.createElement('span'); all.className='chip active'; all.textContent='Todos';
  all.addEventListener('click',()=>{ setActive(all); renderProducts(PRODUCTS); });
  chips.appendChild(all);
  cats.forEach(cat=>{
    const c = document.createElement('span'); c.className='chip'; c.textContent=cat;
    c.addEventListener('click',()=>{ setActive(c); renderProducts(PRODUCTS.filter(p=>p.category===cat)); });
    chips.appendChild(c);
  });
}
function setActive(el){ chips.querySelectorAll('.chip').forEach(x=>x.classList.remove('active')); el.classList.add('active'); }
function renderProducts(list){
  grid.innerHTML='';
  list.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'card tilt';
    card.innerHTML = `
      ${p.onSale ? '<div class="badge sale">OFERTA</div>' : ''}
      <div class="tilt-wrap"><div class="tilt-content"><img src="${p.img}" alt="${p.title}"></div></div>
      <div class="title">${p.title}</div>
      <div class="meta">
        <span>$${Number(p.price).toLocaleString()}</span>
        <button class="btn btn-ghost" data-id="${p.id||''}">Detalles</button>
      </div>`;
    attachTilt(card);
    grid.appendChild(card);
  });
}
document.getElementById('searchBtn').addEventListener('click',()=>{
  const t = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = PRODUCTS.filter(p=> (p.title+' '+(p.category||'')+' '+(p.keywords||[]).join(' ')).toLowerCase().includes(t) );
  renderProducts(filtered);
});
document.getElementById('voiceBtn').addEventListener('click',()=>{
  if(!('webkitSpeechRecognition' in window)){ alert('Tu navegador no soporta voz.'); return; }
  const rec = new webkitSpeechRecognition(); rec.lang = 'es-MX';
  rec.onresult = (ev)=>{
    const txt = ev.results[0][0].transcript;
    document.getElementById('searchInput').value = txt;
    const t = txt.trim().toLowerCase();
    const filtered = PRODUCTS.filter(p=> (p.title+' '+(p.category||'')+' '+(p.keywords||[]).join(' ')).toLowerCase().includes(t) );
    renderProducts(filtered);
  }; rec.start();
});

const videosGrid = document.getElementById('videosGrid');
async function loadVideos(){
  try{
    const res = await fetch('./data/videos.json'); const items = await res.json();
    videosGrid.innerHTML = '';
    for(const v of items){
      const card = document.createElement('div'); card.className='video-card';
      card.innerHTML = `<video src="${v.src}" controls playsinline></video><div class="caption">${v.caption||''}</div>`;
      videosGrid.appendChild(card);
    }
  }catch(e){
    videosGrid.innerHTML = '<div class="caption">Crea data/videos.json y assets/product_videos/ con tus mp4.</div>';
  }
}

document.getElementById('openPoe').addEventListener('click', ()=>{
  const url = CONFIG.poe_chat_url || 'https://poe.com/';
  window.open(url, '_blank', 'noopener');
});
document.getElementById('btnExplorar').addEventListener('click',()=>{
  document.getElementById('catalogo').scrollIntoView({behavior:'smooth'});
});

loadProducts();
loadVideos();
