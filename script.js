/* =========================================================
   اردو پینا فلیکس ڈیزائنر — Application Logic
   M Ijaz · GHS 124/NB
   ========================================================= */

/* ---------- Small utils ---------- */
const $  = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const uid = () => 'el_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const clamp = (v,min,max) => Math.max(min, Math.min(max, v));

function toast(msg, ms=2200){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(()=>t.classList.remove('show'), ms);
}

function safeLS_set(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch(e){ toast('⚠️ اسٹوریج بھر گیا — پرانے ڈیزائن ڈیلیٹ کریں'); return false; }
}
function safeLS_get(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(e){ return fallback; }
}

/* ---------- Global State ---------- */
const State = {
  schoolInfo: safeLS_get('pfd_school', {
    name:'Government High School Chak No.124 NB', emis:'38440014',
    tehsil:'Sillanwali', district:'Sargodha', head:'', address:'', logo:'',
    brand:{ primary:'#0F5132', secondary:'#C9A227', defaultFont:"'Noto Nastaliq Urdu'", customFonts:[] }
  }),
  settings: safeLS_get('pfd_settings', {
    dark:false, quality:2, watermark:true, watermarkText:'M Ijaz · GHS 124/NB'
  }),
  projects: safeLS_get('pfd_projects', []),
  library: [], // session-only uploaded images
  current: null,      // active project being edited
  selectedId: null,
  history: [],
  historyIdx: -1,
  navStack: ['dashboard'],
  scale: 1,
  designListFilter: 'all' // all | recent | favorites
};

if(!State.schoolInfo.brand){
  State.schoolInfo.brand = { primary:'#0F5132', secondary:'#C9A227', defaultFont:"'Noto Nastaliq Urdu'", customFonts:[] };
}

/* ---------- Size presets ---------- */
const SIZE_PRESETS = [
  {key:'portrait', label:'Portrait', w:1080, h:1350},
  {key:'landscape', label:'Landscape', w:1350, h:1080},
  {key:'2x3ft', label:'2×3 فٹ', w:400, h:600},
  {key:'3x5ft', label:'3×5 فٹ', w:600, h:1000},
  {key:'4x6ft', label:'4×6 فٹ', w:800, h:1200},
  {key:'5x8ft', label:'5×8 فٹ', w:1000, h:1600},
  {key:'6x10ft', label:'6×10 فٹ', w:1200, h:2000},
  {key:'fb', label:'Facebook Post', w:1200, h:630},
  {key:'wa', label:'WhatsApp Status', w:1080, h:1920},
  {key:'ig', label:'Instagram Post', w:1080, h:1080},
  {key:'yt', label:'YouTube Thumbnail', w:1280, h:720},
];

/* ---------- Theme backgrounds ---------- */
const THEME_BGS = [
  {key:'pk', label:'پاکستان سبز', css:'linear-gradient(160deg,#0B3D2A,#176B44)'},
  {key:'islamic', label:'اسلامی گولڈ', css:'linear-gradient(160deg,#0B3D2A,#3B6B4A 60%,#C9A227)'},
  {key:'gold', label:'گولڈ شمر', css:'linear-gradient(135deg,#8a6d1a,#e4c878,#8a6d1a)'},
  {key:'dark', label:'ڈارک', css:'linear-gradient(160deg,#111,#333)'},
  {key:'light', label:'لائٹ', css:'linear-gradient(160deg,#ffffff,#f0ece0)'},
  {key:'maroon', label:'تعزیتی', css:'linear-gradient(160deg,#2b1b12,#5c3a24)'},
  {key:'blue', label:'بلیو', css:'linear-gradient(160deg,#0b2a4d,#1e5b96)'},
];

/* ---------- Templates ---------- */
function tpl(cat, name, bgCss, els){
  return {id:'t_'+name, cat, name, bg:{type:'solid', css:bgCss}, w:1080, h:1350, elements:els};
}
function T(x,y,w,h,text,size,color,opts={}){
  return Object.assign({id:uid(), type:'text', x,y,w,h, rot:0, z:0, locked:false, hidden:false,
    text, fontFamily:(State.schoolInfo.brand&&State.schoolInfo.brand.defaultFont)||"'Noto Nastaliq Urdu'", fontSize:size, color, bold:false, italic:false,
    underline:false, align:'center', bg:'transparent', opacity:1, shadow:true, border:false,
    letterSpacing:0, lineHeight:1.3}, opts);
}
const TEMPLATES = [
  tpl('قومی تقریبات','یوم دفاع', 'linear-gradient(160deg,#0B3D2A,#176B44 70%,#C9A227)', [
    T(60,120,960,140,'یوم دفاع پاکستان',86,'#ffffff',{bold:true}),
    T(60,300,960,80,'6 ستمبر — پاک فوج کے شہداء کو خراج عقیدت',34,'#E4C878'),
    T(60,1100,960,70,'{{SCHOOL_NAME}}',36,'#ffffff',{bold:true}),
    T(60,1180,960,50,'{{TEHSIL}} · {{DISTRICT}}',24,'#E4C878'),
  ]),
  tpl('قومی تقریبات','یوم آزادی', 'linear-gradient(160deg,#0B3D2A,#176B44)', [
    T(60,150,960,150,'یوم آزادی مبارک',88,'#ffffff',{bold:true}),
    T(60,340,960,60,'14 اگست — جشنِ آزادی',30,'#E4C878'),
    T(60,1120,960,70,'{{SCHOOL_NAME}}',34,'#ffffff',{bold:true}),
  ]),
  tpl('قومی تقریبات','قائداعظم ڈے', 'linear-gradient(160deg,#111,#0B3D2A)', [
    T(60,180,960,150,'یومِ قائداعظم',86,'#E4C878',{bold:true}),
    T(60,360,960,60,'25 دسمبر — بانیٔ پاکستان کی یاد میں',28,'#ffffff'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسکول','خوش آمدید', 'linear-gradient(160deg,#176B44,#0B3D2A)', [
    T(60,200,960,160,'خوش آمدید',96,'#ffffff',{bold:true}),
    T(60,400,960,60,'نئے تعلیمی سال میں سب کو خوش آمدید',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسکول','نتائج کا اعلان', 'linear-gradient(160deg,#0b2a4d,#1e5b96)', [
    T(60,180,960,140,'نتائج کا اعلان',80,'#ffffff',{bold:true}),
    T(60,360,960,90,'سالانہ امتحانات کے نتائج جاری کر دیے گئے ہیں',30,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسلامی','رمضان المبارک', 'linear-gradient(160deg,#0B3D2A,#3B6B4A 60%,#C9A227)', [
    T(60,200,960,150,'رمضان المبارک',90,'#ffffff',{bold:true}),
    T(60,400,960,60,'اللہ تعالیٰ یہ ماہِ مبارک قبول فرمائے',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسلامی','عیدالفطر مبارک', 'linear-gradient(135deg,#8a6d1a,#e4c878,#8a6d1a)', [
    T(60,200,960,150,'عید مبارک',96,'#1C1B19',{bold:true}),
    T(60,400,960,60,'عیدالفطر کی خوشیاں مبارک ہوں',30,'#3a2e0e'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#1C1B19'),
  ]),
  tpl('تعزیتی','اظہار تعزیت', 'linear-gradient(160deg,#2b1b12,#5c3a24)', [
    T(60,220,960,70,'اِنَّا لِلّٰہِ وَاِنَّآ اِلَیْہِ رَاجِعُوْن',44,'#E4C878'),
    T(60,340,960,150,'اظہار تعزیت',80,'#ffffff',{bold:true}),
    T(60,520,960,80,'اللہ تعالیٰ مرحوم کے درجات بلند فرمائے',28,'#e8e2d5'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',30,'#ffffff'),
  ]),
  tpl('مبارکباد','کامیابی مبارک', 'linear-gradient(135deg,#8a6d1a,#e4c878,#8a6d1a)', [
    T(60,220,960,150,'مبارک ہو!',96,'#1C1B19',{bold:true}),
    T(60,420,960,60,'شاندار کامیابی پر دلی مبارکباد',28,'#3a2e0e'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#1C1B19'),
  ]),
  tpl('اعلانات','اہم اعلان', 'linear-gradient(160deg,#8A2E2E,#5c1d1d)', [
    T(60,180,960,140,'اہم اعلان',80,'#ffffff',{bold:true}),
    T(60,360,960,160,'یہاں اعلان کی تفصیل لکھیں',30,'#ffe9e9'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',30,'#ffffff'),
  ]),

  /* ===== قومی تقریبات (additional) ===== */
  tpl('قومی تقریبات','یوم اقبال', 'linear-gradient(160deg,#111,#1e5b96)', [
    T(60,180,960,140,'یومِ اقبال',86,'#E4C878',{bold:true}),
    T(60,360,960,70,'9 نومبر — شاعرِ مشرق کی یاد میں',28,'#ffffff'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),

  /* ===== اسلامی (additional) ===== */
  tpl('اسلامی','عیدالاضحی مبارک', 'linear-gradient(135deg,#0B3D2A,#C9A227)', [
    T(60,200,960,150,'عیدالاضحی مبارک',82,'#ffffff',{bold:true}),
    T(60,400,960,60,'قربانی کی عید کی خوشیاں مبارک ہوں',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسلامی','ربیع الاول', 'linear-gradient(160deg,#0B3D2A,#176B44)', [
    T(60,200,960,80,'ماہِ ربیع الاول مبارک',54,'#E4C878',{bold:true}),
    T(60,320,960,140,'میلاد النبی ﷺ',72,'#ffffff',{bold:true}),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسلامی','شبِ برات', 'linear-gradient(160deg,#111,#0B3D2A)', [
    T(60,220,960,150,'شبِ برات مبارک',80,'#E4C878',{bold:true}),
    T(60,400,960,60,'اللہ تعالیٰ اس رات کی برکتیں عطا فرمائے',28,'#ffffff'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسلامی','محفل میلاد', 'linear-gradient(160deg,#0B3D2A,#3B6B4A 60%,#C9A227)', [
    T(60,180,960,140,'محفلِ میلاد النبی ﷺ',70,'#ffffff',{bold:true}),
    T(60,360,960,90,'بروز جمعہ، بعد نمازِ عصر تشریف لائیں',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',30,'#ffffff'),
  ]),
  tpl('اسلامی','جمعۃ المبارک', 'linear-gradient(135deg,#8a6d1a,#e4c878,#8a6d1a)', [
    T(60,220,960,150,'جمعۃ المبارک',90,'#1C1B19',{bold:true}),
    T(60,420,960,60,'اللہ تعالیٰ آپ کا جمعہ مبارک فرمائے',28,'#3a2e0e'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#1C1B19'),
  ]),
  tpl('اسلامی','اسلامی دعا', 'linear-gradient(160deg,#0B3D2A,#176B44)', [
    T(60,260,960,220,'رَبَّنَا آتِنَا فِی الدُّنْیَا حَسَنَۃً وَّفِی الْآخِرَۃِ حَسَنَۃً',38,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',30,'#ffffff'),
  ]),

  /* ===== تعزیتی (additional) ===== */
  tpl('تعزیتی','دعائے مغفرت', 'linear-gradient(160deg,#2b1b12,#5c3a24)', [
    T(60,220,960,70,'اِنَّا لِلّٰہِ وَاِنَّآ اِلَیْہِ رَاجِعُوْن',44,'#E4C878'),
    T(60,340,960,150,'دعائے مغفرت',76,'#ffffff',{bold:true}),
    T(60,520,960,90,'اللہ تعالیٰ مرحوم کی مغفرت فرمائے اور جنت الفردوس میں جگہ عطا فرمائے',26,'#e8e2d5'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',30,'#ffffff'),
  ]),
  tpl('تعزیتی','ایصالِ ثواب', 'linear-gradient(160deg,#2b1b12,#5c3a24)', [
    T(60,240,960,70,'اِنَّا لِلّٰہِ وَاِنَّآ اِلَیْہِ رَاجِعُوْن',42,'#E4C878'),
    T(60,360,960,150,'ایصالِ ثواب',76,'#ffffff',{bold:true}),
    T(60,540,960,90,'قرآن خوانی کی نشست بروز جمعہ منعقد ہوگی',26,'#e8e2d5'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',30,'#ffffff'),
  ]),

  /* ===== مبارکباد (additional) ===== */
  tpl('مبارکباد','شادی مبارک', 'linear-gradient(135deg,#8A2E2E,#C9A227)', [
    T(60,220,960,150,'شادی مبارک',90,'#ffffff',{bold:true}),
    T(60,420,960,60,'خوشگوار زندگی کی نیک تمنائیں',28,'#ffe9e9'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('مبارکباد','سالگرہ مبارک', 'linear-gradient(135deg,#0b2a4d,#1e5b96)', [
    T(60,220,960,150,'سالگرہ مبارک',88,'#ffffff',{bold:true}),
    T(60,420,960,60,'خوشیوں بھری زندگی کی دعا',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('مبارکباد','نئی ملازمت مبارک', 'linear-gradient(160deg,#0B3D2A,#176B44)', [
    T(60,220,960,150,'مبارک ہو!',90,'#ffffff',{bold:true}),
    T(60,420,960,70,'نئی ملازمت پر دلی مبارکباد',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('مبارکباد','ریٹائرمنٹ مبارک', 'linear-gradient(135deg,#8a6d1a,#e4c878,#8a6d1a)', [
    T(60,220,960,150,'شاندار خدمات مبارک',68,'#1C1B19',{bold:true}),
    T(60,420,960,70,'ریٹائرمنٹ پر مبارکباد اور نیک خواہشات',28,'#3a2e0e'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#1C1B19'),
  ]),
  tpl('مبارکباد','ترقی مبارک', 'linear-gradient(160deg,#0b2a4d,#1e5b96)', [
    T(60,220,960,150,'ترقی مبارک ہو',86,'#ffffff',{bold:true}),
    T(60,420,960,60,'نئے عہدے پر دلی مبارکباد',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('مبارکباد','خوش آمدید / استقبال', 'linear-gradient(160deg,#176B44,#0B3D2A)', [
    T(60,220,960,150,'خوش آمدید',94,'#ffffff',{bold:true}),
    T(60,420,960,60,'ہمارے ادارے میں آپ کا استقبال ہے',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),

  /* ===== اسکول (additional) ===== */
  tpl('اسکول','Annual Function', 'linear-gradient(135deg,#0B3D2A,#C9A227)', [
    T(60,180,960,140,'سالانہ تقریب',80,'#ffffff',{bold:true}),
    T(60,360,960,90,'سالانہ فنکشن میں شرکت کی دعوت',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسکول','Prize Distribution', 'linear-gradient(135deg,#8a6d1a,#e4c878,#8a6d1a)', [
    T(60,180,960,140,'تقسیمِ انعامات',78,'#1C1B19',{bold:true}),
    T(60,360,960,90,'نمایاں کارکردگی پر مبارکباد',28,'#3a2e0e'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#1C1B19'),
  ]),
  tpl('اسکول','Teachers Day', 'linear-gradient(160deg,#0b2a4d,#1e5b96)', [
    T(60,180,960,140,'یومِ اساتذہ مبارک',68,'#ffffff',{bold:true}),
    T(60,360,960,90,'ہمارے قابلِ احترام اساتذہ کے لیے',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسکول','Students Activities', 'linear-gradient(160deg,#176B44,#0B3D2A)', [
    T(60,180,960,140,'طلبہ سرگرمیاں',76,'#ffffff',{bold:true}),
    T(60,360,960,90,'ہفتہ وار سرگرمیوں کی تفصیل',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسکول','School Admission', 'linear-gradient(160deg,#0B3D2A,#176B44)', [
    T(60,160,960,140,'داخلے جاری ہیں',80,'#ffffff',{bold:true}),
    T(60,340,960,90,'نئے تعلیمی سال کے لیے داخلہ اب کھلا ہے',28,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),
  tpl('اسکول','School Achievement', 'linear-gradient(135deg,#0B3D2A,#C9A227)', [
    T(60,180,960,140,'قابلِ فخر کامیابی',72,'#ffffff',{bold:true}),
    T(60,360,960,90,'ہمارے ادارے کی نمایاں کامیابی پر مبارکباد',26,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',32,'#ffffff'),
  ]),

  /* ===== اعلانات (additional) ===== */
  tpl('اعلانات','عوامی اطلاع', 'linear-gradient(160deg,#0b2a4d,#1e5b96)', [
    T(60,180,960,140,'عوامی اطلاع',80,'#ffffff',{bold:true}),
    T(60,360,960,160,'یہاں اطلاع کی تفصیل لکھیں',30,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',30,'#ffffff'),
  ]),
  tpl('اعلانات','اسکول نوٹس', 'linear-gradient(160deg,#111,#333)', [
    T(60,180,960,140,'اسکول نوٹس',80,'#ffffff',{bold:true}),
    T(60,360,960,160,'یہاں نوٹس کی تفصیل لکھیں',30,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',30,'#ffffff'),
  ]),
  tpl('اعلانات','پروگرام اعلان', 'linear-gradient(160deg,#0B3D2A,#176B44)', [
    T(60,180,960,140,'پروگرام اعلان',78,'#ffffff',{bold:true}),
    T(60,360,960,160,'تاریخ، وقت اور مقام یہاں لکھیں',30,'#E4C878'),
    T(60,1150,960,70,'{{SCHOOL_NAME}}',30,'#ffffff'),
  ]),
];

/* =========================================================
   NAVIGATION
   ========================================================= */
const SCREEN_TITLES = {
  'dashboard':'اردو پینا فلیکس ڈیزائنر','new-design':'نیا ڈیزائن','templates':'ٹیمپلیٹس',
  'my-designs':'میرے ڈیزائن','school-info':'ادارے کی معلومات','settings':'سیٹنگز',
  'ai-assistant':'AI ڈیزائن اسسٹنٹ','editor':'ایڈیٹر','recent':'حالیہ ڈیزائن',
  'favorites':'پسندیدہ','photo-design':'تصویر سے ڈیزائن','library':'میری لائبریری'
};

function showScreen(name, push=true){
  if(name==='ai-assistant'){ openAiHomeSheet(); return; }
  if(name==='recent'){ State.designListFilter='recent'; name='my-designs'; }
  else if(name==='favorites'){ State.designListFilter='favorites'; name='my-designs'; }
  else if(name==='library'){ renderLibraryScreenFallback(); return; }
  else if(name==='photo-design'){ startPhotoDesign(); return; }
  else { State.designListFilter='all'; }

  $$('.screen').forEach(s=>s.classList.remove('active'));
  const el = $('#screen-'+name);
  if(el) el.classList.add('active');
  $('#topbarTitle').textContent = SCREEN_TITLES[name] || '';
  const topbar = $('.topbar');
  const bottomNav = $('#bottomNav');
  if(name==='editor'){ topbar.style.display='none'; bottomNav.style.display='none'; }
  else { topbar.style.display='flex'; bottomNav.style.display='flex'; }

  $('#btnBack').hidden = (name==='dashboard');
  $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.nav===name || (name==='my-designs'&&b.dataset.nav==='my-designs')));

  if(push){ State.navStack.push(name); }
  if(name==='new-design') renderSizeGrid();
  if(name==='templates') renderTemplates();
  if(name==='my-designs') renderDesignGrid();
  if(name==='school-info') fillSchoolForm();
  if(name==='settings') fillSettingsForm();
}

$('#btnBack').addEventListener('click', ()=>{
  State.navStack.pop();
  const prev = State.navStack.pop() || 'dashboard';
  showScreen(prev);
});
$$('[data-nav]').forEach(b=>b.addEventListener('click', ()=> showScreen(b.dataset.nav)));

$('#btnTheme').addEventListener('click', ()=>{
  State.settings.dark = !State.settings.dark;
  applyTheme(); safeLS_set('pfd_settings', State.settings);
});
function applyTheme(){
  document.documentElement.setAttribute('data-theme', State.settings.dark ? 'dark':'light');
  const dm = $('#setDark'); if(dm) dm.checked = State.settings.dark;
}

/* =========================================================
   NEW DESIGN — SIZE PICKER
   ========================================================= */
function renderSizeGrid(){
  const grid = $('#sizeGrid'); grid.innerHTML='';
  SIZE_PRESETS.forEach(p=>{
    const b = document.createElement('button');
    b.className='size-card';
    b.innerHTML = `${p.label}<span class="dim">${p.w}×${p.h}px</span>`;
    b.addEventListener('click', ()=> createNewProject(p.w,p.h));
    grid.appendChild(b);
  });
}
$('#btnCustomSize').addEventListener('click', ()=>{
  const w = parseInt($('#customW').value), h = parseInt($('#customH').value);
  if(!w||!h||w<50||h<50){ toast('درست چوڑائی اور اونچائی درج کریں'); return; }
  createNewProject(clamp(w,50,4000), clamp(h,50,4000));
});

function blankProject(w,h){
  return { id:'p_'+Date.now(), name:'ڈیزائن '+new Date().toLocaleDateString('ur-PK'),
    w,h, background:{type:'solid', css:'#ffffff'}, elements:[], favorite:false,
    createdAt:Date.now(), updatedAt:Date.now(), thumb:'' };
}
function createNewProject(w,h){
  State.current = blankProject(w,h);
  State.selectedId = null;
  resetHistory();
  showScreen('editor');
  initEditorCanvas();
}

/* =========================================================
   TEMPLATES
   ========================================================= */
function renderTemplates(){
  const cats = ['سب', ...new Set(TEMPLATES.map(t=>t.cat))];
  const catRow = $('#templateCats'); catRow.innerHTML='';
  cats.forEach((c,i)=>{
    const chip = document.createElement('button');
    chip.className='chip'+(i===0?' active':'');
    chip.textContent=c;
    chip.addEventListener('click', ()=>{
      $$('.chip', catRow).forEach(x=>x.classList.remove('active'));
      chip.classList.add('active');
      renderTemplateGrid(c==='سب' ? null : c);
    });
    catRow.appendChild(chip);
  });
  renderTemplateGrid(null);
}
function renderTemplateGrid(cat){
  const grid = $('#templateGrid'); grid.innerHTML='';
  TEMPLATES.filter(t=> !cat || t.cat===cat).forEach(t=>{
    const card = document.createElement('div'); card.className='template-card';
    const headingEl = t.elements.find(e=>e.type==='text');
    card.innerHTML = `<div class="template-preview" style="background:${t.bg.css}">${headingEl?headingEl.text.replace('{{SCHOOL_NAME}}','اسکول'):t.name}</div><div class="template-name">${t.name}</div>`;
    card.addEventListener('click', ()=> applyTemplate(t));
    grid.appendChild(card);
  });
}
function fillPlaceholders(str){
  const s = State.schoolInfo;
  return str.replaceAll('{{SCHOOL_NAME}}', s.name||'ہمارا ادارہ')
            .replaceAll('{{EMIS}}', s.emis||'')
            .replaceAll('{{TEHSIL}}', s.tehsil||'')
            .replaceAll('{{DISTRICT}}', s.district||'');
}
function applyTemplate(t){
  const proj = blankProject(t.w, t.h);
  proj.background = JSON.parse(JSON.stringify(t.bg));
  proj.elements = t.elements.map((e,i)=> Object.assign(JSON.parse(JSON.stringify(e)), {
    id:uid(), z:i, text: e.text ? fillPlaceholders(e.text) : e.text
  }));
  if(State.schoolInfo.logo){
    proj.elements.push({id:uid(), type:'image', x:proj.w/2-70, y:40, w:140,h:140, rot:0,
      z:proj.elements.length, locked:false, hidden:false, src:State.schoolInfo.logo, opacity:1, radius:0, border:0, borderColor:'#ffffff'});
  }
  State.current = proj; State.selectedId=null; resetHistory();
  showScreen('editor'); initEditorCanvas();
}

/* =========================================================
   PHOTO-BASED DESIGN
   ========================================================= */
function startPhotoDesign(){
  const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.addEventListener('change', ()=>{
    const f = inp.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.naturalWidth, h = img.naturalHeight;
        const maxDim = 1200;
        if(Math.max(w,h) > maxDim){ const r = maxDim/Math.max(w,h); w=Math.round(w*r); h=Math.round(h*r); }
        const proj = blankProject(w,h);
        proj.background = {type:'image', src:reader.result, fit:'cover', overlay:0};
        State.current = proj; State.selectedId=null; resetHistory();
        showScreen('editor'); initEditorCanvas();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });
  inp.click();
}
function renderLibraryScreenFallback(){
  showScreen('my-designs');
  toast('میری لائبریری میں اس سیشن کی اپلوڈ کردہ تصاویر شامل ہیں — ایڈیٹر میں "تصویر" ٹول سے دیکھیں');
}

/* =========================================================
   MY DESIGNS
   ========================================================= */
function renderDesignGrid(){
  let list = State.projects.slice();
  if(State.designListFilter==='favorites') list = list.filter(p=>p.favorite);
  if(State.designListFilter==='recent') list.sort((a,b)=>b.updatedAt-a.updatedAt);
  else list.sort((a,b)=>b.updatedAt-a.updatedAt);
  const q = ($('#designSearch').value||'').trim();
  if(q) list = list.filter(p=> p.name.includes(q));

  const grid = $('#designGrid'); grid.innerHTML='';
  $('#designEmptyHint').hidden = list.length>0;
  list.forEach(p=>{
    const card = document.createElement('div'); card.className='design-card';
    card.innerHTML = `
      <img src="${p.thumb||''}" alt="${p.name}">
      <div class="meta">${p.name} ${p.favorite?'⭐':''}</div>
      <div class="actions">
        <button data-act="edit">Edit</button>
        <button data-act="dup">Copy</button>
        <button data-act="fav">${p.favorite?'Unfav':'Fav'}</button>
        <button data-act="del">Del</button>
      </div>`;
    card.querySelector('[data-act="edit"]').addEventListener('click', ()=>{
      State.current = JSON.parse(JSON.stringify(p)); State.selectedId=null; resetHistory();
      showScreen('editor'); initEditorCanvas();
    });
    card.querySelector('[data-act="dup"]').addEventListener('click', ()=>{
      const copy = JSON.parse(JSON.stringify(p)); copy.id='p_'+Date.now(); copy.name+=' (Copy)';
      copy.createdAt=Date.now(); copy.updatedAt=Date.now();
      State.projects.push(copy); safeLS_set('pfd_projects', State.projects); renderDesignGrid();
    });
    card.querySelector('[data-act="fav"]').addEventListener('click', ()=>{
      p.favorite = !p.favorite; safeLS_set('pfd_projects', State.projects); renderDesignGrid();
    });
    card.querySelector('[data-act="del"]').addEventListener('click', ()=>{
      if(!confirm('یہ ڈیزائن ڈیلیٹ کریں؟')) return;
      State.projects = State.projects.filter(x=>x.id!==p.id);
      safeLS_set('pfd_projects', State.projects); renderDesignGrid();
    });
    grid.appendChild(card);
  });
}
$('#designSearch').addEventListener('input', renderDesignGrid);

/* =========================================================
   SCHOOL INFO
   ========================================================= */
function fillSchoolForm(){
  const s = State.schoolInfo;
  $('#siName').value=s.name; $('#siEmis').value=s.emis; $('#siTehsil').value=s.tehsil;
  $('#siDistrict').value=s.district; $('#siHead').value=s.head||''; $('#siAddress').value=s.address||'';
  const prev = $('#siLogoPreview');
  if(s.logo){ prev.src=s.logo; prev.hidden=false; } else prev.hidden=true;
  fillBrandKitForm();
}
function fillBrandKitForm(){
  const b = State.schoolInfo.brand;
  $('#brandPrimary').value = b.primary; $('#brandSecondary').value = b.secondary;
  const sel = $('#brandDefaultFont');
  sel.innerHTML = FONT_OPTIONS.map(f=>`<option value="${f.key}" ${b.defaultFont===f.key?'selected':''}>${f.label}</option>`).join('');
  renderBrandFontList();
}
function renderBrandFontList(){
  const list = State.schoolInfo.brand.customFonts || [];
  const box = $('#brandFontList');
  box.innerHTML = list.length ? list.map((f,i)=>
    `<button data-del-font="${i}">🗑️ ${f.name} حذف کریں</button>`).join('')
    : '<p class="hint">ابھی کوئی کسٹم فونٹ اپلوڈ نہیں کیا گیا۔</p>';
  $$('[data-del-font]', box).forEach(btn=> btn.addEventListener('click', ()=>{
    const i = +btn.dataset.delFont;
    State.schoolInfo.brand.customFonts.splice(i,1);
    safeLS_set('pfd_school', State.schoolInfo);
    renderBrandFontList();
    toast('فونٹ حذف کر دیا گیا (ایپ دوبارہ کھولنے پر مکمل اطلاق ہوگا)');
  }));
}
$('#brandFontFile').addEventListener('change', ()=>{
  const f = $('#brandFontFile').files[0]; if(!f) return;
  const name = $('#brandFontName').value.trim() || f.name.replace(/\.[^.]+$/,'');
  if(f.size > 2*1024*1024){ toast('⚠️ فونٹ فائل 2MB سے کم ہونی چاہیے'); return; }
  const reader = new FileReader();
  reader.onload = async ()=>{
    const list = State.schoolInfo.brand.customFonts;
    if(list.length>=3){ toast('⚠️ زیادہ سے زیادہ 3 کسٹم فونٹس محفوظ ہو سکتے ہیں — پہلے کوئی حذف کریں'); return; }
    list.push({name, dataUrl:reader.result});
    const ok = safeLS_set('pfd_school', State.schoolInfo);
    if(ok){ await loadCustomFonts(); fillBrandKitForm(); toast('✅ فونٹ شامل ہو گیا'); }
    $('#brandFontFile').value=''; $('#brandFontName').value='';
  };
  reader.readAsDataURL(f);
});
$('#btnSaveBrandKit').addEventListener('click', ()=>{
  State.schoolInfo.brand.primary = $('#brandPrimary').value;
  State.schoolInfo.brand.secondary = $('#brandSecondary').value;
  State.schoolInfo.brand.defaultFont = $('#brandDefaultFont').value;
  safeLS_set('pfd_school', State.schoolInfo);
  toast('✅ برانڈ کٹ محفوظ ہو گئی');
});
$('#siLogo').addEventListener('change', ()=>{
  const f = $('#siLogo').files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{ State.schoolInfo.logo = reader.result; fillSchoolForm(); };
  reader.readAsDataURL(f);
});
$('#btnSaveSchoolInfo').addEventListener('click', ()=>{
  Object.assign(State.schoolInfo, {
    name: $('#siName').value.trim() || 'ہمارا ادارہ',
    emis: $('#siEmis').value.trim(), tehsil: $('#siTehsil').value.trim(),
    district: $('#siDistrict').value.trim(), head: $('#siHead').value.trim(),
    address: $('#siAddress').value.trim()
  });
  safeLS_set('pfd_school', State.schoolInfo);
  $('#schoolNameHero').textContent = State.schoolInfo.name;
  toast('ادارے کی معلومات محفوظ ہو گئیں');
  showScreen('dashboard');
});

/* =========================================================
   SETTINGS
   ========================================================= */
function fillSettingsForm(){
  $('#setDark').checked = State.settings.dark;
  $('#setQuality').value = State.settings.quality;
  $('#setWatermark').checked = State.settings.watermark;
  $('#setWatermarkText').value = State.settings.watermarkText;
  updateStorageUsage();
}
function updateStorageUsage(){
  try{
    let bytes=0; for(const k in localStorage) if(localStorage.hasOwnProperty(k)) bytes += localStorage[k].length*2;
    $('#storageUsage').textContent = (bytes/1024/1024).toFixed(2)+' MB';
  }catch(e){ $('#storageUsage').textContent='—'; }
}
$('#setDark').addEventListener('change', ()=>{ State.settings.dark=$('#setDark').checked; applyTheme(); safeLS_set('pfd_settings',State.settings); });
$('#setQuality').addEventListener('change', ()=>{ State.settings.quality=+$('#setQuality').value; safeLS_set('pfd_settings',State.settings); });
$('#setWatermark').addEventListener('change', ()=>{ State.settings.watermark=$('#setWatermark').checked; safeLS_set('pfd_settings',State.settings); });
$('#setWatermarkText').addEventListener('input', ()=>{ State.settings.watermarkText=$('#setWatermarkText').value; safeLS_set('pfd_settings',State.settings); });

$('#btnBackupData').addEventListener('click', ()=>{
  const data = { schoolInfo:State.schoolInfo, settings:State.settings, projects:State.projects };
  const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'penaflex-backup-'+Date.now()+'.json'; a.click();
});
$('#btnRestoreData').addEventListener('click', ()=> $('#restoreFile').click());
$('#restoreFile').addEventListener('change', ()=>{
  const f = $('#restoreFile').files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      if(data.schoolInfo) State.schoolInfo = data.schoolInfo;
      if(data.settings) State.settings = data.settings;
      if(data.projects) State.projects = data.projects;
      safeLS_set('pfd_school', State.schoolInfo); safeLS_set('pfd_settings', State.settings); safeLS_set('pfd_projects', State.projects);
      applyTheme(); toast('ڈیٹا بحال ہو گیا');
    }catch(e){ toast('فائل درست نہیں'); }
  };
  reader.readAsText(f);
});

/* =========================================================
   EDITOR ENGINE
   ========================================================= */
let dragCtx = null;

function initEditorCanvas(){
  const stage = $('#canvasStage');
  stage.innerHTML=''; stage.style.width = State.current.w+'px'; stage.style.height = State.current.h+'px';
  applyBackgroundToStage();
  State.current.elements.sort((a,b)=>a.z-b.z).forEach(el=> stage.appendChild(buildElNode(el)));
  fitCanvasToViewport();
  deselectAll();
}
window.addEventListener('resize', ()=>{ if($('#screen-editor').classList.contains('active')) fitCanvasToViewport(); });

function fitCanvasToViewport(){
  const vp = $('#canvasViewport');
  const availW = vp.clientWidth - 28, availH = vp.clientHeight - 28;
  const scale = clamp(Math.min(availW/State.current.w, availH/State.current.h), 0.05, 2);
  State.scale = scale;
  const stage = $('#canvasStage');
  stage.style.transform = `scale(${scale})`;
  stage.style.transformOrigin = 'top left';
  let wrap = $('#stageWrap');
  wrap.style.width = (State.current.w*scale)+'px';
  wrap.style.height = (State.current.h*scale)+'px';
}
// wrap the stage so scaled box participates correctly in flex centering
(function ensureWrap(){
  const vp = $('#canvasViewport');
  const stage = $('#canvasStage');
  const wrap = document.createElement('div');
  wrap.id='stageWrap'; wrap.style.position='relative'; wrap.style.flexShrink='0';
  vp.replaceChild(wrap, stage);
  wrap.appendChild(stage);
})();

function applyBackgroundToStage(){
  const stage = $('#canvasStage'); const bg = State.current.background;
  stage.style.backgroundImage=''; stage.style.background='#fff';
  if(bg.type==='solid'){ stage.style.background = bg.css; }
  else if(bg.type==='gradient'){ stage.style.background = bg.css; }
  else if(bg.type==='image'){
    stage.style.backgroundImage = `linear-gradient(rgba(0,0,0,${(bg.overlay||0)/100}),rgba(0,0,0,${(bg.overlay||0)/100})), url(${bg.src})`;
    stage.style.backgroundSize = bg.fit==='contain' ? 'contain':'cover';
    stage.style.backgroundPosition='center'; stage.style.backgroundRepeat='no-repeat';
  }
}

function buildElNode(el){
  const node = document.createElement('div');
  node.className='el'+(el.locked?' locked':''); node.id=el.id;
  node.style.display = el.hidden ? 'none':'block';
  positionNode(node, el);
  renderElContent(node, el);
  if(!el.locked){
    node.addEventListener('pointerdown', onElPointerDown);
    node.addEventListener('dblclick', ()=> tryEditText(el.id));
  }
  return node;
}
function positionNode(node, el){
  node.style.left = el.x+'px'; node.style.top = el.y+'px';
  node.style.width = el.w+'px'; node.style.height = el.h+'px';
  node.style.zIndex = el.z;
  node.style.transform = `rotate(${el.rot||0}deg)`;
}
function renderElContent(node, el){
  node.innerHTML='';
  if(el.type==='text'){
    node.classList.add('el-text');
    const inner = document.createElement('div');
    inner.style.width='100%'; inner.style.height='100%'; inner.style.display='flex';
    inner.style.alignItems='center';
    inner.style.justifyContent = el.align==='left'?'flex-start':el.align==='right'?'flex-end':'center';
    inner.style.fontFamily = el.fontFamily; inner.style.fontSize = el.fontSize+'px';
    inner.style.color = el.color; inner.style.fontWeight = el.bold?'700':'400';
    inner.style.fontStyle = el.italic?'italic':'normal';
    inner.style.textDecoration = el.underline?'underline':'none';
    inner.style.background = el.bg==='transparent'?'transparent':el.bg;
    inner.style.opacity = el.opacity;
    inner.style.letterSpacing = (el.letterSpacing||0)+'px';
    inner.style.lineHeight = (el.lineHeight||1.3);
    inner.style.textAlign = el.align;
    inner.style.direction = /[\u0600-\u06FF]/.test(el.text) ? 'rtl':'ltr';
    inner.style.whiteSpace='pre-wrap'; inner.style.wordBreak='break-word'; inner.style.width='100%';
    if(el.shadow) inner.style.textShadow='2px 2px 6px rgba(0,0,0,.55)';
    if(el.border) inner.style.webkitTextStroke = '1px rgba(0,0,0,.6)';
    inner.textContent = el.text;
    inner.dataset.role='text-inner';
    node.appendChild(inner);
  } else if(el.type==='image'){
    node.classList.add('el-image');
    const img = document.createElement('img');
    img.src = el.src; img.style.opacity = el.opacity??1;
    img.style.borderRadius = (el.radius||0)+'%';
    img.style.border = el.border ? `${el.border}px solid ${el.borderColor||'#fff'}`:'none';
    img.style.filter = `brightness(${el.brightness??100}%) contrast(${el.contrast??100}%)`;
    img.style.transform = `scale(${el.flipH?-1:1}, ${el.flipV?-1:1})`;
    node.appendChild(img);
  } else if(el.type==='shape'){
    node.classList.add('el-shape');
    if(el.shape==='line'){
      node.style.background='none';
      const svg = `<svg width="100%" height="100%" viewBox="0 0 ${el.w} ${el.h}" preserveAspectRatio="none"><line x1="0" y1="${el.h/2}" x2="${el.w}" y2="${el.h/2}" stroke="${el.stroke||'#000'}" stroke-width="${el.strokeWidth||4}"/></svg>`;
      node.innerHTML = svg;
    } else {
      const isCircle = el.shape==='circle';
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('width','100%'); svg.setAttribute('height','100%');
      svg.setAttribute('viewBox',`0 0 ${el.w} ${el.h}`); svg.setAttribute('preserveAspectRatio','none');
      const shapeEl = document.createElementNS('http://www.w3.org/2000/svg', isCircle?'ellipse':'rect');
      if(isCircle){ shapeEl.setAttribute('cx',el.w/2); shapeEl.setAttribute('cy',el.h/2); shapeEl.setAttribute('rx',el.w/2); shapeEl.setAttribute('ry',el.h/2); }
      else { shapeEl.setAttribute('width',el.w); shapeEl.setAttribute('height',el.h); shapeEl.setAttribute('rx',8); }
      shapeEl.setAttribute('fill', el.fill||'#176B44');
      shapeEl.setAttribute('stroke', el.stroke||'none');
      shapeEl.setAttribute('stroke-width', el.strokeWidth||0);
      shapeEl.setAttribute('opacity', el.opacity??1);
      svg.appendChild(shapeEl); node.appendChild(svg);
    }
  }
  if(el.id===State.selectedId && !el.locked) addHandles(node, el);
}
function addHandles(node){
  const del = document.createElement('div'); del.className='handle delete'; del.textContent='✕';
  del.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); deleteElement(node.id); });
  const rot = document.createElement('div'); rot.className='handle rotate'; rot.textContent='⟲';
  rot.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); startRotate(e, node.id); });
  const rez = document.createElement('div'); rez.className='handle resize'; rez.textContent='⤡';
  rez.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); startResize(e, node.id); });
  node.appendChild(del); node.appendChild(rot); node.appendChild(rez);
  node.classList.add('selected');
}
function getEl(id){ return State.current.elements.find(e=>e.id===id); }
function getNode(id){ return document.getElementById(id); }

function selectElement(id){
  State.selectedId = id;
  $$('.el', $('#canvasStage')).forEach(n=>{
    n.classList.remove('selected');
    n.querySelectorAll('.handle').forEach(h=>h.remove());
  });
  if(id){ const el = getEl(id); const node = getNode(id); if(el && node && !el.locked) addHandles(node, el); }
}
function deselectAll(){ selectElement(null); }
$('#canvasViewport').addEventListener('pointerdown', (e)=>{ if(e.target.id==='canvasViewport' || e.target.id==='stageWrap' || e.target.id==='canvasStage') deselectAll(); });

/* ---- Drag / Resize / Rotate ---- */
function onElPointerDown(e){
  if(e.target.classList.contains('handle')) return;
  const node = e.currentTarget; const el = getEl(node.id);
  if(!el || el.locked) return;
  e.stopPropagation();
  selectElement(el.id);
  if(node.querySelector('[contenteditable="true"]')) return; // editing text, don't drag
  node.setPointerCapture(e.pointerId);
  dragCtx = { type:'move', id:el.id, startX:e.clientX, startY:e.clientY, ox:el.x, oy:el.y };
  node.addEventListener('pointermove', onElPointerMove);
  node.addEventListener('pointerup', onElPointerUp);
  node.style.cursor='grabbing';
}
function onElPointerMove(e){
  if(!dragCtx || dragCtx.type!=='move') return;
  const el = getEl(dragCtx.id); if(!el) return;
  const dx = (e.clientX - dragCtx.startX)/State.scale, dy = (e.clientY - dragCtx.startY)/State.scale;
  el.x = dragCtx.ox + dx; el.y = dragCtx.oy + dy;
  positionNode(getNode(el.id), el);
}
function onElPointerUp(e){
  const node = e.currentTarget;
  node.removeEventListener('pointermove', onElPointerMove);
  node.removeEventListener('pointerup', onElPointerUp);
  node.style.cursor='grab';
  if(dragCtx){ pushHistory(); dragCtx=null; }
}
function startResize(e, id){
  const el = getEl(id); if(!el) return;
  const node = getNode(id); node.setPointerCapture(e.pointerId);
  dragCtx = { type:'resize', id, startX:e.clientX, startY:e.clientY, ow:el.w, oh:el.h, rot:(el.rot||0)*Math.PI/180 };
  node.addEventListener('pointermove', onResizeMove);
  node.addEventListener('pointerup', onHandleUp);
}
function onResizeMove(e){
  if(!dragCtx||dragCtx.type!=='resize') return;
  const el = getEl(dragCtx.id); if(!el) return;
  const dx=(e.clientX-dragCtx.startX)/State.scale, dy=(e.clientY-dragCtx.startY)/State.scale;
  const c=Math.cos(dragCtx.rot), s=Math.sin(dragCtx.rot);
  const localDX = dx*c + dy*s, localDY = -dx*s + dy*c;
  el.w = clamp(dragCtx.ow + localDX, 20, 4000);
  el.h = clamp(dragCtx.oh + localDY, 20, 4000);
  positionNode(getNode(el.id), el);
}
function startRotate(e, id){
  const el = getEl(id); if(!el) return;
  const node = getNode(id); const rect = node.getBoundingClientRect();
  const cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
  node.setPointerCapture(e.pointerId);
  const startAngle = Math.atan2(e.clientY-cy, e.clientX-cx);
  dragCtx = { type:'rotate', id, cx, cy, startAngle, startRot: el.rot||0 };
  node.addEventListener('pointermove', onRotateMove);
  node.addEventListener('pointerup', onHandleUp);
}
function onRotateMove(e){
  if(!dragCtx||dragCtx.type!=='rotate') return;
  const el = getEl(dragCtx.id); if(!el) return;
  const angle = Math.atan2(e.clientY-dragCtx.cy, e.clientX-dragCtx.cx);
  el.rot = Math.round(dragCtx.startRot + (angle-dragCtx.startAngle)*180/Math.PI);
  positionNode(getNode(el.id), el);
}
function onHandleUp(e){
  const node = e.currentTarget;
  node.removeEventListener('pointermove', onResizeMove);
  node.removeEventListener('pointermove', onRotateMove);
  node.removeEventListener('pointerup', onHandleUp);
  if(dragCtx){ pushHistory(); dragCtx=null; }
}

/* ---- Text editing ---- */
function tryEditText(id){
  const el = getEl(id); if(!el || el.type!=='text' || el.locked) return;
  const node = getNode(id); const inner = node.querySelector('[data-role="text-inner"]');
  inner.contentEditable='true'; inner.focus();
  document.execCommand && window.getSelection().selectAllChildren(inner);
  inner.addEventListener('blur', function onBlur(){
    el.text = inner.textContent;
    inner.contentEditable='false';
    inner.removeEventListener('blur', onBlur);
    pushHistory();
  }, {once:true});
}

/* ---- Element CRUD ---- */
function addElement(el){
  el.z = State.current.elements.length ? Math.max(...State.current.elements.map(e=>e.z))+1 : 0;
  State.current.elements.push(el);
  $('#canvasStage').appendChild(buildElNode(el));
  selectElement(el.id);
  pushHistory();
}
function deleteElement(id){
  State.current.elements = State.current.elements.filter(e=>e.id!==id);
  const n = getNode(id); if(n) n.remove();
  if(State.selectedId===id) State.selectedId=null;
  pushHistory();
}
function duplicateElement(id){
  const el = getEl(id); if(!el) return;
  const copy = JSON.parse(JSON.stringify(el)); copy.id=uid(); copy.x+=24; copy.y+=24;
  addElement(copy);
}
function refreshSelectedNode(){
  const el = getEl(State.selectedId); if(!el) return;
  const node = getNode(el.id); positionNode(node, el); renderElContent(node, el);
}

/* ---- History ---- */
function snapshot(){ return JSON.stringify({background:State.current.background, elements:State.current.elements}); }
function resetHistory(){ State.history=[snapshot()]; State.historyIdx=0; }
function pushHistory(){
  State.history = State.history.slice(0, State.historyIdx+1);
  State.history.push(snapshot());
  if(State.history.length>40) State.history.shift();
  State.historyIdx = State.history.length-1;
}
function restoreSnapshot(json){
  const data = JSON.parse(json);
  State.current.background = data.background; State.current.elements = data.elements;
  applyBackgroundToStage();
  const stage = $('#canvasStage'); stage.querySelectorAll('.el').forEach(n=>n.remove());
  State.current.elements.sort((a,b)=>a.z-b.z).forEach(el=> stage.appendChild(buildElNode(el)));
  selectElement(null);
}
$('#btnUndo').addEventListener('click', ()=>{
  if(State.historyIdx<=0) return; State.historyIdx--; restoreSnapshot(State.history[State.historyIdx]);
});
$('#btnRedo').addEventListener('click', ()=>{
  if(State.historyIdx>=State.history.length-1) return; State.historyIdx++; restoreSnapshot(State.history[State.historyIdx]);
});
$('#btnGuides').addEventListener('click', ()=> $('#canvasStage').classList.toggle('show-grid'));

/* =========================================================
   BOTTOM SHEET (contextual panels)
   ========================================================= */
function openSheet(html){
  $('#sheetContent').innerHTML = html;
  $('#bottomSheet').classList.add('show');
  $('#sheetBackdrop').classList.add('show');
}
function closeSheet(){
  $('#bottomSheet').classList.remove('show');
  $('#sheetBackdrop').classList.remove('show');
  $('#sheetContent').innerHTML='';
}
$('#sheetBackdrop').addEventListener('click', closeSheet);

/* ---- Toolbar wiring ---- */
$$('.tbtn').forEach(b=> b.addEventListener('click', ()=> handleTool(b.dataset.tool)));

function handleTool(tool){
  if(tool==='text') return openTextTool();
  if(tool==='image') return openImageTool();
  if(tool==='logo') return insertLogo();
  if(tool==='shape') return openShapeTool();
  if(tool==='background') return openBackgroundTool();
  if(tool==='qr') return openQrTool();
  if(tool==='ai') return openAiTool();
  if(tool==='align') return openAlignTool();
  if(tool==='arrange') return openArrangeTool();
}

/* ---- TEXT TOOL ---- */
let FONT_OPTIONS = [
  {key:"'Noto Nastaliq Urdu'", label:'نستعلیق (اردو)'},
  {key:"'Noto Naskh Arabic'", label:'نسخ (اردو/عربی)'},
  {key:"'Noto Sans Arabic'", label:'سادہ اردو'},
  {key:"Georgia, serif", label:'English Serif'},
  {key:"Arial, sans-serif", label:'English Sans'},
];
const COLOR_SWATCHES = ['#ffffff','#1C1B19','#C9A227','#0F5132','#8A2E2E','#0b2a4d','#e4c878','#5c3a24'];
function paletteSwatches(){
  const b = State.schoolInfo.brand || {};
  const brandColors = [b.primary, b.secondary].filter(Boolean);
  const rest = COLOR_SWATCHES.filter(c => !brandColors.some(bc => bc && bc.toLowerCase()===c.toLowerCase()));
  return [...brandColors, ...rest];
}

/* ---- Custom font loading (Brand Kit) ---- */
function customFontFamilyName(idx){ return 'PFCustomFont'+idx; }
async function loadCustomFonts(){
  const fonts = (State.schoolInfo.brand && State.schoolInfo.brand.customFonts) || [];
  for(let i=0;i<fonts.length;i++){
    const f = fonts[i];
    const famName = customFontFamilyName(i);
    try{
      const face = new FontFace(famName, `url(${f.dataUrl})`);
      await face.load();
      document.fonts.add(face);
      if(!FONT_OPTIONS.some(o=>o.key===`'${famName}'`)){
        FONT_OPTIONS.push({key:`'${famName}'`, label:'🔤 '+f.name});
      }
    }catch(e){ /* skip a font that fails to load */ }
  }
}

function openTextTool(){
  let el = getEl(State.selectedId);
  let isNew = false;
  if(!el || el.type!=='text'){
    el = T(State.current.w/2-200, State.current.h/2-40, 400, 80, 'یہاں تحریر لکھیں', 48, '#1C1B19');
    isNew = true;
  }
  const html = `
    <h4>ٹیکسٹ</h4>
    <textarea id="txtContent" dir="rtl">${el.text}</textarea>
    <h4>فونٹ</h4>
    <div class="font-list">${FONT_OPTIONS.map(f=>`<button data-font="${f.key}" class="${el.fontFamily===f.key?'active':''}" style="font-family:${f.key}">${f.label}</button>`).join('')}</div>
    <div class="field-row"><label>سائز</label><input type="range" id="txtSize" min="12" max="180" value="${el.fontSize}"><span id="txtSizeVal">${el.fontSize}</span></div>
    <h4>رنگ</h4>
    <div class="swatches" id="txtColorSwatches">${paletteSwatches().map(c=>`<button class="swatch ${el.color===c?'selected':''}" data-c="${c}" style="background:${c}"></button>`).join('')}<input type="color" id="txtColorCustom" value="${el.color}"></div>
    <div class="toggle-row">
      <button id="txtBold" class="${el.bold?'active':''}"><b>B</b></button>
      <button id="txtItalic" class="${el.italic?'active':''}"><i>I</i></button>
      <button id="txtUnderline" class="${el.underline?'active':''}"><u>U</u></button>
      <button id="txtShadow" class="${el.shadow?'active':''}">Shadow</button>
      <button id="txtBorder" class="${el.border?'active':''}">Border</button>
    </div>
    <div class="toggle-row">
      <button data-align="right" class="${el.align==='right'?'active':''}">دائیں</button>
      <button data-align="center" class="${el.align==='center'?'active':''}">وسط</button>
      <button data-align="left" class="${el.align==='left'?'active':''}">بائیں</button>
    </div>
    <div class="field-row"><label>شفافیت</label><input type="range" id="txtOpacity" min="10" max="100" value="${Math.round(el.opacity*100)}"></div>
    <div class="field-row"><label>حروف کا فاصلہ</label><input type="range" id="txtLetterSpacing" min="0" max="20" value="${el.letterSpacing||0}"></div>
    <div class="sheet-actions">
      <button class="btn-secondary" id="txtDone">مکمل ✓</button>
    </div>`;
  openSheet(html);
  if(isNew) addElement(el); else refreshSelectedNode();

  const apply = ()=>{ refreshSelectedNode(); };
  $('#txtContent').addEventListener('input', ()=>{ el.text=$('#txtContent').value; apply(); });
  $$('.font-list button', $('#sheetContent')).forEach(b=> b.addEventListener('click', ()=>{
    el.fontFamily=b.dataset.font; $$('.font-list button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); apply();
  }));
  $('#txtSize').addEventListener('input', ()=>{ el.fontSize=+$('#txtSize').value; $('#txtSizeVal').textContent=el.fontSize; apply(); });
  $$('#txtColorSwatches .swatch').forEach(s=> s.addEventListener('click', ()=>{ el.color=s.dataset.c; apply(); }));
  $('#txtColorCustom').addEventListener('input', ()=>{ el.color=$('#txtColorCustom').value; apply(); });
  $('#txtBold').addEventListener('click', ()=>{ el.bold=!el.bold; $('#txtBold').classList.toggle('active'); apply(); });
  $('#txtItalic').addEventListener('click', ()=>{ el.italic=!el.italic; $('#txtItalic').classList.toggle('active'); apply(); });
  $('#txtUnderline').addEventListener('click', ()=>{ el.underline=!el.underline; $('#txtUnderline').classList.toggle('active'); apply(); });
  $('#txtShadow').addEventListener('click', ()=>{ el.shadow=!el.shadow; $('#txtShadow').classList.toggle('active'); apply(); });
  $('#txtBorder').addEventListener('click', ()=>{ el.border=!el.border; $('#txtBorder').classList.toggle('active'); apply(); });
  $$('[data-align]', $('#sheetContent')).forEach(b=> b.addEventListener('click', ()=>{
    el.align=b.dataset.align; $$('[data-align]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); apply();
  }));
  $('#txtOpacity').addEventListener('input', ()=>{ el.opacity=+$('#txtOpacity').value/100; apply(); });
  $('#txtLetterSpacing').addEventListener('input', ()=>{ el.letterSpacing=+$('#txtLetterSpacing').value; apply(); });
  $('#txtDone').addEventListener('click', ()=>{ pushHistory(); closeSheet(); });
}

/* ---- IMAGE TOOL ---- */
function openImageTool(){
  const selEl = getEl(State.selectedId);
  if(selEl && selEl.type==='image'){ return openImageEditSheet(selEl); }
  const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.addEventListener('change', ()=>{
    const f = inp.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      State.library.push(reader.result);
      const img = new Image();
      img.onload = ()=>{
        const maxW = State.current.w*0.6;
        let w = img.naturalWidth, h = img.naturalHeight;
        if(w>maxW){ const r=maxW/w; w*=r; h*=r; }
        const el = {id:uid(), type:'image', x:(State.current.w-w)/2, y:(State.current.h-h)/2, w, h, rot:0,
          z:0, locked:false, hidden:false, src:reader.result, opacity:1, radius:0, border:0, borderColor:'#ffffff',
          brightness:100, contrast:100, flipH:false, flipV:false};
        addElement(el);
        openImageEditSheet(el);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });
  inp.click();
}
function openImageEditSheet(el){
  const html = `
    <h4>تصویر</h4>
    <div class="field-row"><label>شفافیت</label><input type="range" id="imgOpacity" min="10" max="100" value="${Math.round(el.opacity*100)}"></div>
    <div class="field-row"><label>گولائی</label><input type="range" id="imgRadius" min="0" max="50" value="${el.radius||0}"></div>
    <div class="field-row"><label>روشنی</label><input type="range" id="imgBright" min="40" max="160" value="${el.brightness??100}"></div>
    <div class="field-row"><label>کنٹراسٹ</label><input type="range" id="imgContrast" min="40" max="160" value="${el.contrast??100}"></div>
    <div class="field-row"><label>بارڈر</label><input type="range" id="imgBorder" min="0" max="20" value="${el.border||0}"></div>
    <div class="toggle-row">
      <button id="imgFlipH">↔️ Flip H</button>
      <button id="imgFlipV">↕️ Flip V</button>
      <button id="imgRemoveBg">✂️ BG ہٹائیں</button>
    </div>
    <div class="sheet-actions"><button class="btn-secondary" id="imgDone">مکمل ✓</button></div>`;
  openSheet(html);
  const apply=()=>refreshSelectedNode();
  $('#imgOpacity').addEventListener('input', ()=>{ el.opacity=+$('#imgOpacity').value/100; apply(); });
  $('#imgRadius').addEventListener('input', ()=>{ el.radius=+$('#imgRadius').value; apply(); });
  $('#imgBright').addEventListener('input', ()=>{ el.brightness=+$('#imgBright').value; apply(); });
  $('#imgContrast').addEventListener('input', ()=>{ el.contrast=+$('#imgContrast').value; apply(); });
  $('#imgBorder').addEventListener('input', ()=>{ el.border=+$('#imgBorder').value; apply(); });
  $('#imgFlipH').addEventListener('click', ()=>{ el.flipH=!el.flipH; apply(); });
  $('#imgFlipV').addEventListener('click', ()=>{ el.flipV=!el.flipV; apply(); });
  $('#imgRemoveBg').addEventListener('click', ()=> removeImageBackground(el));
  $('#imgDone').addEventListener('click', ()=>{ pushHistory(); closeSheet(); });
}
function insertLogo(){
  if(!State.schoolInfo.logo){ toast('پہلے "ادارے کی معلومات" میں لوگو اپلوڈ کریں'); return; }
  const w=160,h=160;
  const el = {id:uid(), type:'image', x:(State.current.w-w)/2, y:30, w, h, rot:0, z:0, locked:false, hidden:false,
    src:State.schoolInfo.logo, opacity:1, radius:0, border:0, borderColor:'#ffffff', brightness:100, contrast:100};
  addElement(el);
}
async function removeImageBackground(el){
  toast('بیک گراؤنڈ ہٹائی جا رہی ہے... (انٹرنیٹ درکار ہے)');
  try{
    await loadMediaPipeIfNeeded();
    const img = new Image(); img.crossOrigin='anonymous';
    await new Promise((res,rej)=>{ img.onload=res; img.onerror=rej; img.src=el.src; });
    const selfie = new SelfieSegmentation({locateFile:(f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`});
    selfie.setOptions({modelSelection:1});
    const outCanvas = document.createElement('canvas'); outCanvas.width=img.naturalWidth; outCanvas.height=img.naturalHeight;
    const ctx = outCanvas.getContext('2d');
    await new Promise((resolve,reject)=>{
      selfie.onResults((results)=>{
        ctx.clearRect(0,0,outCanvas.width,outCanvas.height);
        ctx.drawImage(results.segmentationMask,0,0,outCanvas.width,outCanvas.height);
        ctx.globalCompositeOperation='source-in';
        ctx.drawImage(results.image,0,0,outCanvas.width,outCanvas.height);
        ctx.globalCompositeOperation='source-over';
        resolve();
      });
      selfie.send({image:img}).catch(reject);
    });
    el.src = outCanvas.toDataURL('image/png');
    refreshSelectedNode(); pushHistory();
    toast('بیک گراؤنڈ ہٹا دی گئی');
  }catch(e){
    toast('⚠️ بیک گراؤنڈ ہٹانے میں مسئلہ — انٹرنیٹ چیک کریں یا دوبارہ کوشش کریں');
  }
}
function loadMediaPipeIfNeeded(){
  if(window.SelfieSegmentation) return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const s = document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
    s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
  });
}

/* ---- SHAPE TOOL ---- */
function openShapeTool(){
  const html = `
    <h4>شکل منتخب کریں</h4>
    <div class="toggle-row">
      <button data-shape="rect" class="active">▭ چوکور</button>
      <button data-shape="circle">◯ گول</button>
      <button data-shape="line">▬ لائن</button>
    </div>
    <h4>رنگ</h4>
    <div class="swatches" id="shapeColorSwatches">${paletteSwatches().map(c=>`<button class="swatch" data-c="${c}" style="background:${c}"></button>`).join('')}<input type="color" id="shapeColorCustom" value="#176B44"></div>
    <div class="sheet-actions"><button class="btn-primary" id="shapeInsert">شامل کریں</button></div>`;
  openSheet(html);
  let shapeType='rect', color='#176B44';
  $$('[data-shape]', $('#sheetContent')).forEach(b=> b.addEventListener('click', ()=>{
    shapeType=b.dataset.shape; $$('[data-shape]').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  }));
  $$('#shapeColorSwatches .swatch').forEach(s=> s.addEventListener('click', ()=>{ color=s.dataset.c; $('#shapeColorCustom').value=color; }));
  $('#shapeColorCustom').addEventListener('input', ()=>{ color=$('#shapeColorCustom').value; });
  $('#shapeInsert').addEventListener('click', ()=>{
    const w = shapeType==='line'?300:220, h = shapeType==='line'?6:220;
    const el = {id:uid(), type:'shape', shape:shapeType, x:(State.current.w-w)/2, y:(State.current.h-h)/2, w,h, rot:0,
      z:0, locked:false, hidden:false, fill:color, stroke:'none', strokeWidth:0, opacity:1};
    addElement(el); closeSheet();
  });
}

/* ---- BACKGROUND TOOL ---- */
function openBackgroundTool(){
  const html = `
    <h4>بیک گراؤنڈ</h4>
    <div class="chip-row" id="bgTabs">
      <button class="chip active" data-tab="solid">Solid</button>
      <button class="chip" data-tab="theme">تھیم</button>
      <button class="chip" data-tab="brand">🎨 برانڈ</button>
      <button class="chip" data-tab="gradient">Gradient</button>
      <button class="chip" data-tab="image">تصویر</button>
    </div>
    <div id="bgTabContent"></div>
    <div class="sheet-actions"><button class="btn-secondary" id="bgDone">مکمل ✓</button></div>`;
  openSheet(html);
  const renderTab = (tab)=>{
    const c = $('#bgTabContent');
    if(tab==='solid'){
      c.innerHTML = `<div class="swatches" id="bgSolidSwatches">${paletteSwatches().map(cc=>`<button class="swatch" data-c="${cc}" style="background:${cc}"></button>`).join('')}<input type="color" id="bgSolidCustom" value="#ffffff"></div>`;
      $$('#bgSolidSwatches .swatch').forEach(s=> s.addEventListener('click', ()=>{ setBg({type:'solid',css:s.dataset.c}); }));
      $('#bgSolidCustom').addEventListener('input', ()=> setBg({type:'solid', css:$('#bgSolidCustom').value}));
    } else if(tab==='theme'){
      c.innerHTML = `<div class="list-select">${THEME_BGS.map(t=>`<button data-theme-bg="${t.key}" style="background:${t.css};color:#fff">${t.label}</button>`).join('')}</div>`;
      $$('[data-theme-bg]', c).forEach(b=> b.addEventListener('click', ()=>{
        const t = THEME_BGS.find(x=>x.key===b.dataset.themeBg); setBg({type:'solid', css:t.css});
      }));
    } else if(tab==='brand'){
      const b = State.schoolInfo.brand;
      c.innerHTML = `
        <div class="list-select">
          <button id="brandSolidP" style="background:${b.primary};color:#fff">پرائمری رنگ (Solid)</button>
          <button id="brandSolidS" style="background:${b.secondary};color:#fff">سیکنڈری رنگ (Solid)</button>
          <button id="brandGrad" style="background:linear-gradient(135deg,${b.primary},${b.secondary});color:#fff">برانڈ گریڈینٹ</button>
        </div>
        <p class="hint">یہ رنگ "ادارے کی معلومات" → برانڈ کٹ سے آ رہے ہیں۔</p>`;
      $('#brandSolidP').addEventListener('click', ()=> setBg({type:'solid', css:b.primary}));
      $('#brandSolidS').addEventListener('click', ()=> setBg({type:'solid', css:b.secondary}));
      $('#brandGrad').addEventListener('click', ()=> setBg({type:'gradient', css:`linear-gradient(135deg,${b.primary},${b.secondary})`}));
    } else if(tab==='gradient'){
      c.innerHTML = `
        <div class="field-row"><label>رنگ 1</label><input type="color" id="gradC1" value="#0B3D2A"></div>
        <div class="field-row"><label>رنگ 2</label><input type="color" id="gradC2" value="#C9A227"></div>
        <div class="field-row"><label>زاویہ</label><input type="range" id="gradAngle" min="0" max="360" value="160"></div>
        <button class="btn-primary" id="gradApply">لاگو کریں</button>`;
      $('#gradApply').addEventListener('click', ()=>{
        const css = `linear-gradient(${$('#gradAngle').value}deg, ${$('#gradC1').value}, ${$('#gradC2').value})`;
        setBg({type:'gradient', css});
      });
    } else if(tab==='image'){
      c.innerHTML = `
        <input type="file" id="bgImageFile" accept="image/*">
        <div class="field-row"><label>سیاہ اوورلے</label><input type="range" id="bgOverlay" min="0" max="80" value="${State.current.background.overlay||0}"></div>
        <div class="toggle-row"><button data-fit="cover" class="active">Cover</button><button data-fit="contain">Contain</button></div>`;
      let fit='cover';
      $('#bgImageFile').addEventListener('change', ()=>{
        const f = $('#bgImageFile').files[0]; if(!f) return;
        const reader = new FileReader();
        reader.onload = ()=> setBg({type:'image', src:reader.result, fit, overlay:+($('#bgOverlay').value||0)});
        reader.readAsDataURL(f);
      });
      $('#bgOverlay').addEventListener('input', ()=>{
        if(State.current.background.type==='image'){ State.current.background.overlay=+$('#bgOverlay').value; applyBackgroundToStage(); }
      });
      $$('[data-fit]', c).forEach(b=> b.addEventListener('click', ()=>{
        fit=b.dataset.fit; $$('[data-fit]',c).forEach(x=>x.classList.remove('active')); b.classList.add('active');
        if(State.current.background.type==='image'){ State.current.background.fit=fit; applyBackgroundToStage(); }
      }));
    }
  };
  const setBg = (bg)=>{ State.current.background = bg; applyBackgroundToStage(); };
  $$('#bgTabs .chip', $('#sheetContent')).forEach(b=> b.addEventListener('click', ()=>{
    $$('#bgTabs .chip').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderTab(b.dataset.tab);
  }));
  renderTab('solid');
  $('#bgDone').addEventListener('click', ()=>{ pushHistory(); closeSheet(); });
}

/* ---- QR TOOL ---- */
function openQrTool(){
  const html = `
    <h4>QR کوڈ</h4>
    <textarea id="qrText" placeholder="لنک، فون نمبر یا متن لکھیں" dir="ltr"></textarea>
    <div class="sheet-actions"><button class="btn-primary" id="qrInsert">QR بنائیں اور شامل کریں</button></div>
    <div id="qrHidden" style="display:none"></div>`;
  openSheet(html);
  $('#qrInsert').addEventListener('click', ()=>{
    const text = $('#qrText').value.trim(); if(!text){ toast('متن درج کریں'); return; }
    const holder = $('#qrHidden'); holder.innerHTML='';
    new QRCode(holder, {text, width:300, height:300, correctLevel: QRCode.CorrectLevel.M});
    setTimeout(()=>{
      const img = holder.querySelector('img') || holder.querySelector('canvas');
      const src = img.tagName==='CANVAS' ? img.toDataURL('image/png') : img.src;
      const w=220,h=220;
      addElement({id:uid(), type:'image', x:(State.current.w-w)/2, y:(State.current.h-h)/2, w,h, rot:0,
        z:0, locked:false, hidden:false, src, opacity:1, radius:0, border:0, brightness:100, contrast:100});
      closeSheet();
    }, 150);
  });
}

/* ---- ALIGN TOOL ---- */
function openAlignTool(){
  if(!State.selectedId){ toast('پہلے کوئی Element منتخب کریں'); return; }
  const html = `
    <h4>ترتیب (Canvas سے)</h4>
    <div class="toggle-row">
      <button data-al="right">دائیں</button><button data-al="hcenter">وسط (افقی)</button><button data-al="left">بائیں</button>
    </div>
    <div class="toggle-row">
      <button data-al="top">اوپر</button><button data-al="vcenter">وسط (عمودی)</button><button data-al="bottom">نیچے</button>
    </div>`;
  openSheet(html);
  $$('[data-al]', $('#sheetContent')).forEach(b=> b.addEventListener('click', ()=>{
    const el = getEl(State.selectedId); if(!el) return;
    const W=State.current.w, H=State.current.h;
    if(b.dataset.al==='right') el.x = W-el.w;
    if(b.dataset.al==='left') el.x = 0;
    if(b.dataset.al==='hcenter') el.x = (W-el.w)/2;
    if(b.dataset.al==='top') el.y = 0;
    if(b.dataset.al==='bottom') el.y = H-el.h;
    if(b.dataset.al==='vcenter') el.y = (H-el.h)/2;
    positionNode(getNode(el.id), el); pushHistory();
  }));
}

/* ---- ARRANGE (copy/delete quick) ---- */
function openArrangeTool(){
  if(!State.selectedId){ toast('پہلے کوئی Element منتخب کریں'); return; }
  const el = getEl(State.selectedId);
  const html = `
    <h4>ترتیب دیں</h4>
    <div class="list-select">
      <button id="arrDup">⎘ Duplicate</button>
      <button id="arrFront">⬆️ Bring to Front</button>
      <button id="arrBack">⬇️ Send to Back</button>
      <button id="arrLock">${el.locked?'🔓 Unlock':'🔒 Lock'}</button>
      <button id="arrHide">${el.hidden?'👁️ Show':'🙈 Hide'}</button>
      <button id="arrDel" class="btn-danger" style="border:none;color:#fff">🗑️ Delete</button>
    </div>`;
  openSheet(html);
  $('#arrDup').addEventListener('click', ()=>{ duplicateElement(el.id); closeSheet(); });
  $('#arrFront').addEventListener('click', ()=>{ el.z = Math.max(...State.current.elements.map(e=>e.z))+1; positionNode(getNode(el.id), el); pushHistory(); });
  $('#arrBack').addEventListener('click', ()=>{ el.z = Math.min(...State.current.elements.map(e=>e.z))-1; positionNode(getNode(el.id), el); pushHistory(); });
  $('#arrLock').addEventListener('click', ()=>{ el.locked=!el.locked; initEditorCanvas(); selectElement(el.id); closeSheet(); pushHistory(); });
  $('#arrHide').addEventListener('click', ()=>{ el.hidden=!el.hidden; getNode(el.id).style.display = el.hidden?'none':'block'; pushHistory(); });
  $('#arrDel').addEventListener('click', ()=>{ deleteElement(el.id); closeSheet(); });
}

/* ---- LAYERS PANEL ---- */
$('#btnLayers').addEventListener('click', ()=>{
  const rows = State.current.elements.slice().sort((a,b)=>b.z-a.z).map(el=>{
    const icon = el.type==='text'?'📝':el.type==='image'?'🖼️':'🔷';
    const name = el.type==='text' ? el.text.slice(0,16) : (el.type==='image'?'تصویر':'شکل');
    return `<div class="layer-row" data-id="${el.id}">
      <span>${icon}</span><span class="lname">${name}</span>
      <button data-act="up" title="Forward">⬆️</button>
      <button data-act="down" title="Backward">⬇️</button>
      <button data-act="lock">${el.locked?'🔒':'🔓'}</button>
      <button data-act="hide">${el.hidden?'🙈':'👁️'}</button>
      <button data-act="dup">⎘</button>
      <button data-act="del">🗑️</button>
    </div>`;
  }).join('') || '<p class="hint">کوئی Element موجود نہیں</p>';
  openSheet(`<h4>Layers</h4>${rows}`);
  $$('.layer-row', $('#sheetContent')).forEach(row=>{
    const id = row.dataset.id; const el = getEl(id);
    row.addEventListener('click', (e)=>{ if(e.target.tagName!=='BUTTON') selectElement(id); });
    row.querySelector('[data-act="up"]').addEventListener('click', ()=>{ el.z++; positionNode(getNode(id),el); pushHistory(); });
    row.querySelector('[data-act="down"]').addEventListener('click', ()=>{ el.z--; positionNode(getNode(id),el); pushHistory(); });
    row.querySelector('[data-act="lock"]').addEventListener('click', ()=>{ el.locked=!el.locked; initEditorCanvas(); pushHistory(); document.getElementById('btnLayers').click(); });
    row.querySelector('[data-act="hide"]').addEventListener('click', ()=>{ el.hidden=!el.hidden; const n=getNode(id); if(n) n.style.display=el.hidden?'none':'block'; pushHistory(); document.getElementById('btnLayers').click(); });
    row.querySelector('[data-act="dup"]').addEventListener('click', ()=>{ duplicateElement(id); document.getElementById('btnLayers').click(); });
    row.querySelector('[data-act="del"]').addEventListener('click', ()=>{ deleteElement(id); document.getElementById('btnLayers').click(); });
  });
});

/* =========================================================
   AI ASSISTANT (Pollinations free text API)
   ========================================================= */
function openAiHomeSheet(){
  // if no project open yet, still allow generating text ideas from dashboard
  if(!$('#screen-editor').classList.contains('active')){ showScreen('new-design'); toast('پہلے سائز منتخب کریں، پھر AI ٹول استعمال کریں'); return; }
  openAiTool();
}
async function pollinate(prompt){
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?referrer=UrduPenaFlexDesigner`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('bad response');
  return (await res.text()).trim();
}
function openAiTool(){
  const selEl = getEl(State.selectedId);
  const html = `
    <h4>🤖 AI سے سرخی/متن بنائیں</h4>
    <textarea id="aiPrompt" dir="rtl" placeholder="مثال: یوم دفاع کے لیے مختصر جذباتی سرخی اردو میں لکھیں">اسکول کے لیے ایک خوبصورت اردو سرخی تجویز کریں</textarea>
    <button class="btn-primary" id="aiGenerate">تجویز بنائیں</button>
    <p class="hint" id="aiResultBox"></p>
    <button class="btn-secondary" id="aiInsert" hidden>متن کے طور پر شامل کریں</button>
    ${selEl && selEl.type==='text' ? `<h4>منتخب متن کی اصلاح</h4><button class="btn-secondary" id="aiFix">اردو ہجے/گرامر درست کریں</button><p class="hint" id="aiFixBox"></p><button class="btn-secondary" id="aiFixApply" hidden>لاگو کریں</button>` : ''}
    <p class="hint">نوٹ: AI فیچر کے لیے انٹرنیٹ کنکشن ضروری ہے۔</p>`;
  openSheet(html);
  let lastResult='';
  $('#aiGenerate').addEventListener('click', async ()=>{
    $('#aiGenerate').textContent='...بن رہا ہے'; $('#aiGenerate').disabled=true;
    try{
      lastResult = await pollinate($('#aiPrompt').value);
      $('#aiResultBox').textContent = lastResult;
      $('#aiInsert').hidden=false;
    }catch(e){ $('#aiResultBox').textContent='⚠️ AI سروس دستیاب نہیں، انٹرنیٹ چیک کریں۔'; }
    $('#aiGenerate').textContent='تجویز بنائیں'; $('#aiGenerate').disabled=false;
  });
  $('#aiInsert').addEventListener('click', ()=>{
    const el = T(State.current.w/2-300, State.current.h/2-40, 600,80, lastResult, 44, '#1C1B19');
    addElement(el); closeSheet();
  });
  const fixBtn = $('#aiFix');
  if(fixBtn) fixBtn.addEventListener('click', async ()=>{
    fixBtn.textContent='...درست ہو رہا ہے'; fixBtn.disabled=true;
    try{
      const fixed = await pollinate('اس اردو متن کی ہجے اور گرامر درست کریں، صرف درست متن دیں: '+selEl.text);
      $('#aiFixBox').textContent = fixed; $('#aiFixApply').hidden=false;
      $('#aiFixApply').onclick = ()=>{ selEl.text=fixed; refreshSelectedNode(); pushHistory(); closeSheet(); };
    }catch(e){ $('#aiFixBox').textContent='⚠️ AI سروس دستیاب نہیں۔'; }
    fixBtn.textContent='اردو ہجے/گرامر درست کریں'; fixBtn.disabled=false;
  });
}

/* =========================================================
   SAVE PROJECT
   ========================================================= */
$('#btnSaveProject').addEventListener('click', saveCurrentProject);
async function saveCurrentProject(){
  State.current.updatedAt = Date.now();
  try{
    deselectAll();
    const canvas = await html2canvas($('#canvasStage'), {backgroundColor:null, scale: 300/State.current.w});
    State.current.thumb = canvas.toDataURL('image/jpeg', 0.7);
  }catch(e){ /* thumbnail best-effort */ }
  const idx = State.projects.findIndex(p=>p.id===State.current.id);
  if(idx>=0) State.projects[idx] = JSON.parse(JSON.stringify(State.current));
  else State.projects.push(JSON.parse(JSON.stringify(State.current)));
  const ok = safeLS_set('pfd_projects', State.projects);
  if(ok) toast('✅ ڈیزائن محفوظ ہو گیا');
}

/* =========================================================
   EXPORT
   ========================================================= */
$('#btnExport').addEventListener('click', openExportSheet);
function openExportSheet(){
  const html = `
    <h4>ایکسپورٹ</h4>
    <div class="toggle-row">
      <button data-fmt="png" class="active">PNG</button>
      <button data-fmt="jpg">JPG</button>
      <button data-fmt="pdf">PDF</button>
    </div>
    <div class="field-row"><label>کوالٹی</label>
      <select id="expQuality">
        <option value="1">Standard</option>
        <option value="2" ${State.settings.quality==2?'selected':''}>High</option>
        <option value="3" ${State.settings.quality==3?'selected':''}>Print</option>
      </select>
    </div>
    <label class="switch-row"><span>واٹرمارک شامل کریں</span><input type="checkbox" id="expWatermark" ${State.settings.watermark?'checked':''}></label>
    <div class="sheet-actions"><button class="btn-primary" id="expGo">ڈاؤن لوڈ کریں</button></div>`;
  openSheet(html);
  let fmt='png';
  $$('[data-fmt]', $('#sheetContent')).forEach(b=> b.addEventListener('click', ()=>{
    fmt=b.dataset.fmt; $$('[data-fmt]').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  }));
  $('#expGo').addEventListener('click', ()=> runExport(fmt, +$('#expQuality').value, $('#expWatermark').checked));
}
async function runExport(fmt, quality, withWatermark){
  toast('⏳ تیار ہو رہا ہے...');
  deselectAll();
  let wmNode=null;
  if(withWatermark){
    wmNode = document.createElement('div');
    wmNode.textContent = State.settings.watermarkText || 'M Ijaz · GHS 124/NB';
    Object.assign(wmNode.style, {position:'absolute', bottom:'10px', left:'10px', fontSize:(State.current.w*0.018)+'px',
      color:'#ffffffcc', textShadow:'1px 1px 3px #000', fontFamily:"'Noto Sans Arabic',sans-serif", zIndex:9999});
    $('#canvasStage').appendChild(wmNode);
  }
  try{
    const canvas = await html2canvas($('#canvasStage'), {backgroundColor:'#ffffff', scale:quality, useCORS:true});
    const filename = (State.current.name||'design').replace(/\s+/g,'_');
    if(fmt==='png'){
      downloadCanvas(canvas, filename+'.png', 'image/png');
    } else if(fmt==='jpg'){
      downloadCanvas(canvas, filename+'.jpg', 'image/jpeg', 0.92);
    } else if(fmt==='pdf'){
      const { jsPDF } = window.jspdf;
      const orientation = State.current.w >= State.current.h ? 'landscape':'portrait';
      const pdf = new jsPDF({orientation, unit:'px', format:[canvas.width, canvas.height]});
      pdf.addImage(canvas.toDataURL('image/jpeg',0.95), 'JPEG', 0,0, canvas.width, canvas.height);
      pdf.save(filename+'.pdf');
    }
    toast('✅ ڈاؤن لوڈ ہو گیا');
  }catch(e){
    toast('⚠️ ایکسپورٹ میں مسئلہ پیش آیا');
  } finally {
    if(wmNode) wmNode.remove();
    closeSheet();
  }
}
function downloadCanvas(canvas, filename, mime, q){
  canvas.toBlob((blob)=>{
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download=filename; a.click();
  }, mime, q);
}

/* =========================================================
   INIT
   ========================================================= */
function handleShortcutAction(){
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  if(!action) return;
  const map = {'new-design':'new-design','templates':'templates','my-designs':'my-designs','school-info':'school-info'};
  if(map[action]) showScreen(map[action]);
}
async function init(){
  applyTheme();
  $('#schoolNameHero').textContent = State.schoolInfo.name;
  showScreen('dashboard', false);
  handleShortcutAction();
  await loadCustomFonts();
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
}
init();
