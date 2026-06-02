// Étiquetage géométrique des 96 départements (build-time).
// Recale le nuage des points-préfectures du SVG sur les coordonnées réelles (ICP + Hongrois),
// puis point-dans-polygone pour assigner un code à chaque tracé.
import { readFileSync, writeFileSync } from 'fs';

// ---------- 1. Table géographique des 96 préfectures (lon, lat) ----------
const PREF = {
  '01':['Bourg-en-Bresse',5.2257,46.2057],'02':['Laon',3.6238,49.5641],'03':['Moulins',3.3349,46.5640],
  '04':['Digne-les-Bains',6.2358,44.0925],'05':['Gap',6.0796,44.5588],'06':['Nice',7.2620,43.7102],
  '07':['Privas',4.5997,44.7349],'08':['Charleville-Mézières',4.7196,49.7628],'09':['Foix',1.6055,42.9637],
  '10':['Troyes',4.0744,48.2973],'11':['Carcassonne',2.3491,43.2130],'12':['Rodez',2.5739,44.3496],
  '13':['Marseille',5.3698,43.2965],'14':['Caen',-0.3708,49.1829],'15':['Aurillac',2.4459,44.9261],
  '16':['Angoulême',0.1560,45.6486],'17':['La Rochelle',-1.1511,46.1603],'18':['Bourges',2.3990,47.0810],
  '19':['Tulle',1.7710,45.2670],'21':['Dijon',5.0415,47.3220],'22':['Saint-Brieuc',-2.7603,48.5141],
  '23':['Guéret',1.8736,46.1693],'24':['Périgueux',0.7184,45.1848],'25':['Besançon',6.0241,47.2378],
  '26':['Valence',4.8920,44.9333],'27':['Évreux',1.1508,49.0241],'28':['Chartres',1.4890,48.4439],
  '29':['Quimper',-4.0976,47.9960],'2A':['Ajaccio',8.7386,41.9192],'2B':['Bastia',9.4509,42.6976],
  '30':['Nîmes',4.3601,43.8367],'31':['Toulouse',1.4442,43.6047],'32':['Auch',0.5855,43.6466],
  '33':['Bordeaux',-0.5792,44.8378],'34':['Montpellier',3.8767,43.6108],'35':['Rennes',-1.6778,48.1173],
  '36':['Châteauroux',1.6919,46.8139],'37':['Tours',0.6848,47.3941],'38':['Grenoble',5.7245,45.1885],
  '39':['Lons-le-Saunier',5.5550,46.6750],'40':['Mont-de-Marsan',-0.4990,43.8907],'41':['Blois',1.3340,47.5860],
  '42':['Saint-Étienne',4.3872,45.4397],'43':['Le Puy-en-Velay',3.8836,45.0430],'44':['Nantes',-1.5536,47.2184],
  '45':['Orléans',1.9090,47.9020],'46':['Cahors',1.4420,44.4475],'47':['Agen',0.6167,44.2050],
  '48':['Mende',3.5000,44.5180],'49':['Angers',-0.5632,47.4784],'50':['Saint-Lô',-1.0900,49.1160],
  '51':['Châlons-en-Champagne',4.3650,48.9560],'52':['Chaumont',5.1390,48.1110],'53':['Laval',-0.7700,48.0700],
  '54':['Nancy',6.1844,48.6921],'55':['Bar-le-Duc',5.1610,48.7710],'56':['Vannes',-2.7600,47.6580],
  '57':['Metz',6.1757,49.1193],'58':['Nevers',3.1570,46.9900],'59':['Lille',3.0573,50.6292],
  '60':['Beauvais',2.0833,49.4294],'61':['Alençon',0.0930,48.4310],'62':['Arras',2.7772,50.2910],
  '63':['Clermont-Ferrand',3.0870,45.7772],'64':['Pau',-0.3700,43.2951],'65':['Tarbes',0.0780,43.2330],
  '66':['Perpignan',2.8954,42.6986],'67':['Strasbourg',7.7521,48.5734],'68':['Colmar',7.3580,48.0790],
  '69':['Lyon',4.8357,45.7640],'70':['Vesoul',6.1560,47.6220],'71':['Mâcon',4.8330,46.3060],
  '72':['Le Mans',0.1996,48.0061],'73':['Chambéry',5.9180,45.5646],'74':['Annecy',6.1294,45.8992],
  '75':['Paris',2.3522,48.8566],'76':['Rouen',1.0993,49.4431],'77':['Melun',2.6607,48.5392],
  '78':['Versailles',2.1301,48.8049],'79':['Niort',-0.4640,46.3230],'80':['Amiens',2.2957,49.8941],
  '81':['Albi',2.1480,43.9290],'82':['Montauban',1.3550,44.0220],'83':['Toulon',5.9280,43.1242],
  '84':['Avignon',4.8055,43.9493],'85':['La Roche-sur-Yon',-1.4270,46.6700],'86':['Poitiers',0.3404,46.5802],
  '87':['Limoges',1.2611,45.8336],'88':['Épinal',6.4490,48.1740],'89':['Auxerre',3.5730,47.7980],
  '90':['Belfort',6.8630,47.6380],'91':['Évry',2.4290,48.6293],'92':['Nanterre',2.2069,48.8924],
  '93':['Bobigny',2.4437,48.9069],'94':['Créteil',2.4530,48.7900],'95':['Cergy',2.0780,49.0360],
};

// ---------- 2. Parser de path -> anneaux (polygones), courbes approximées par leurs extrémités ----------
function pathToRings(d){
  const rings=[]; let ring=[];
  const toks=d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/gi); if(!toks) return rings;
  let i=0,cmd=null,x=0,y=0,sx=0,sy=0;
  const num=()=>parseFloat(toks[i++]);
  const push=()=>ring.push([x,y]);
  while(i<toks.length){
    if(/[a-zA-Z]/.test(toks[i])) cmd=toks[i++];
    const rel=cmd===cmd.toLowerCase(), C=cmd.toUpperCase();
    if(C==='M'){ if(ring.length){rings.push(ring); ring=[];} const a=num(),b=num(); x=rel?x+a:a; y=rel?y+b:b; sx=x; sy=y; push(); cmd=rel?'l':'L'; }
    else if(C==='L'){ const a=num(),b=num(); x=rel?x+a:a; y=rel?y+b:b; push(); }
    else if(C==='H'){ const a=num(); x=rel?x+a:a; push(); }
    else if(C==='V'){ const a=num(); y=rel?y+a:a; push(); }
    else if(C==='C'){ num();num();num();num(); const a=num(),b=num(); x=rel?x+a:a; y=rel?y+b:b; push(); }
    else if(C==='S'||C==='Q'){ num();num(); const a=num(),b=num(); x=rel?x+a:a; y=rel?y+b:b; push(); }
    else if(C==='T'){ const a=num(),b=num(); x=rel?x+a:a; y=rel?y+b:b; push(); }
    else if(C==='A'){ num();num();num();num();num(); const a=num(),b=num(); x=rel?x+a:a; y=rel?y+b:b; push(); }
    else if(C==='Z'){ x=sx; y=sy; if(ring.length){rings.push(ring); ring=[];} }
    else i++;
  }
  if(ring.length) rings.push(ring);
  return rings;
}
function ringsCentroidArea(rings){
  // centroïde pondéré par aire (shoelace) sur tous les anneaux
  let A=0,cx=0,cy=0;
  for(const r of rings){
    let a=0,px=0,py=0;
    for(let k=0;k<r.length;k++){ const [x1,y1]=r[k],[x2,y2]=r[(k+1)%r.length]; const cr=x1*y2-x2*y1; a+=cr; px+=(x1+x2)*cr; py+=(y1+y2)*cr; }
    a*=0.5; if(Math.abs(a)<1e-9) continue; A+=a; cx+=px/6; cy+=py/6;
  }
  if(Math.abs(A)<1e-9){ // dégénéré: moyenne simple
    let n=0,mx=0,my=0; for(const r of rings) for(const p of r){mx+=p[0];my+=p[1];n++;} return {cx:mx/n,cy:my/n,area:0};
  }
  return {cx:cx/A, cy:cy/A, area:Math.abs(A)};
}
function pointInRings(px,py,rings){ // even-odd sur l'ensemble des anneaux
  let inside=false;
  for(const r of rings){
    for(let k=0,j=r.length-1;k<r.length;j=k++){
      const [xi,yi]=r[k],[xj,yj]=r[j];
      if(((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
    }
  }
  return inside;
}

// ---------- 3. Extraction des données SVG ----------
function groupBody(s,id){const i=s.indexOf(`id="${id}"`);if(i<0)return"";let j=s.indexOf(">",i)+1,depth=1;const re=/<g\b|<\/g>/g;re.lastIndex=j;let m;while((m=re.exec(s))){if(m[0]==="</g>"){if(--depth===0)return s.slice(j,m.index);}else depth++;}return s.slice(j);}

const depSvg = readFileSync('départements.svg','utf8');
const depFrance = groupBody(depSvg,'France');
const depPathDs = [...depFrance.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map(m=>m[1]);
const paths = depPathDs.map(d=>{ const rings=pathToRings(d); return {rings, ...ringsCentroidArea(rings)}; });

const prefSvg = readFileSync('préfectures.svg','utf8');
const prefFrance = groupBody(prefSvg,'Prefectures_France');
const dots = [...prefFrance.matchAll(/matrix\(1 0 0 1 ([\-\d.]+) ([\-\d.]+)\)/g)].map(m=>[+m[1],+m[2]]);

console.log('paths(dépt):', paths.length, ' dots(préf):', dots.length);

// ---------- 4. ICP : geo(lon,lat) -> svg(x,y) ----------
const codes = Object.keys(PREF);
const geo = codes.map(c=>[PREF[c][1], PREF[c][2]]); // [lon,lat]
const N = codes.length;

// bbox helper
const bb = pts=>{let a=[1e9,1e9],b=[-1e9,-1e9];for(const p of pts){a[0]=Math.min(a[0],p[0]);a[1]=Math.min(a[1],p[1]);b[0]=Math.max(b[0],p[0]);b[1]=Math.max(b[1],p[1]);}return {a,b,w:b[0]-a[0],h:b[1]-a[1],cx:(a[0]+b[0])/2,cy:(a[1]+b[1])/2};};
const gB=bb(geo), qB=bb(dots);
// init: nord en haut (lat grand -> y petit) => sy négatif
let A=[[qB.w/gB.w,0],[0,-qB.h/gB.h]];
let t=[qB.cx - (A[0][0]*gB.cx + A[0][1]*gB.cy), qB.cy - (A[1][0]*gB.cx + A[1][1]*gB.cy)];
const apply=(p)=>[A[0][0]*p[0]+A[0][1]*p[1]+t[0], A[1][0]*p[0]+A[1][1]*p[1]+t[1]];

// Hongrois (Kuhn-Munkres) O(n^3) sur matrice de coûts carrée
function hungarian(cost){
  const n=cost.length; const INF=1e18;
  const u=new Array(n+1).fill(0),v=new Array(n+1).fill(0),p=new Array(n+1).fill(0),way=new Array(n+1).fill(0);
  for(let i=1;i<=n;i++){
    p[0]=i; let j0=0; const minv=new Array(n+1).fill(INF); const used=new Array(n+1).fill(false);
    do{
      used[j0]=true; const i0=p[j0]; let delta=INF,j1=-1;
      for(let j=1;j<=n;j++) if(!used[j]){ const cur=cost[i0-1][j-1]-u[i0]-v[j]; if(cur<minv[j]){minv[j]=cur;way[j]=j0;} if(minv[j]<delta){delta=minv[j];j1=j;} }
      for(let j=0;j<=n;j++){ if(used[j]){u[p[j]]+=delta; v[j]-=delta;} else minv[j]-=delta; }
      j0=j1;
    }while(p[j0]!==0);
    do{ const j1=way[j0]; p[j0]=p[j1]; j0=j1; }while(j0);
  }
  const assign=new Array(n); for(let j=1;j<=n;j++) assign[p[j]-1]=j-1; // assign[dotIndex]=geoIndex
  return assign;
}

let assign;
for(let iter=0; iter<60; iter++){
  const TP = geo.map(apply); // transformed geo
  // cost[dot][geo] = squared dist
  const cost = dots.map(q=> TP.map(tp=>{ const dx=q[0]-tp[0], dy=q[1]-tp[1]; return dx*dx+dy*dy; }));
  assign = hungarian(cost); // assign[dotIdx]=geoIdx
  // refit affine least squares: solve for A,t mapping geo->dot on matched pairs
  // unknowns: a,b,tx (x = a*lon + b*lat + tx) ; c,d,ty (y = c*lon + d*lat + ty)
  let Sxx=0,Sxy=0,Sx=0,Syy=0,Sy=0,n=0, Tx_lon=0,Tx_lat=0,Tx_1=0, Ty_lon=0,Ty_lat=0,Ty_1=0;
  for(let di=0; di<N; di++){ const gi=assign[di]; const [lon,lat]=geo[gi]; const [qx,qy]=dots[di];
    Sxx+=lon*lon; Sxy+=lon*lat; Sx+=lon; Syy+=lat*lat; Sy+=lat; n++;
    Tx_lon+=qx*lon; Tx_lat+=qx*lat; Tx_1+=qx; Ty_lon+=qy*lon; Ty_lat+=qy*lat; Ty_1+=qy;
  }
  // normal equations matrix M = [[Sxx,Sxy,Sx],[Sxy,Syy,Sy],[Sx,Sy,n]]
  const M=[[Sxx,Sxy,Sx],[Sxy,Syy,Sy],[Sx,Sy,n]];
  const solve3=(M,r)=>{ // Gaussian elim 3x3
    const m=M.map((row,i)=>[...row,r[i]]);
    for(let c=0;c<3;c++){ let piv=c; for(let k=c+1;k<3;k++) if(Math.abs(m[k][c])>Math.abs(m[piv][c]))piv=k; [m[c],m[piv]]=[m[piv],m[c]];
      for(let k=0;k<3;k++) if(k!==c){ const f=m[k][c]/m[c][c]; for(let j=c;j<4;j++) m[k][j]-=f*m[c][j]; } }
    return [m[0][3]/m[0][0], m[1][3]/m[1][1], m[2][3]/m[2][2]]; };
  const [a,b,tx]=solve3(M,[Tx_lon,Tx_lat,Tx_1]);
  const [c,dd,ty]=solve3(M,[Ty_lon,Ty_lat,Ty_1]);
  A=[[a,b],[c,dd]]; t=[tx,ty];
}

// résidu moyen
let res=0; for(let di=0; di<N; di++){ const gi=assign[di]; const tp=apply(geo[gi]); res+=Math.hypot(dots[di][0]-tp[0],dots[di][1]-tp[1]); }
console.log('résidu moyen ICP (px):', (res/N).toFixed(2));

// dotCode[di] = code de département
const dotCode = assign.map(gi=>codes[gi]);
// position svg de chaque dot -> code
const dotByCode = {}; dots.forEach((q,di)=>{ dotByCode[dotCode[di]]=q; });

// ---------- 5. Étiquetage des tracés (affectation par POINT, unicité) ----------
const pathCode = new Array(paths.length).fill(null);
const taken = new Array(paths.length).fill(false);
// Pour chaque point-préfecture, candidats = tracés le contenant (PiP), triés par aire croissante (le plus spécifique),
// puis, en repli, tracés les plus proches du point. On prend le premier non encore pris -> unicité garantie.
for(let di=0; di<dots.length; di++){
  const [px,py]=dots[di];
  const containing=[]; for(let pi=0; pi<paths.length; pi++) if(pointInRings(px,py,paths[pi].rings)) containing.push(pi);
  containing.sort((a,b)=>paths[a].area-paths[b].area);
  const byDist=[...paths.keys()].sort((a,b)=>{const da=(paths[a].cx-px)**2+(paths[a].cy-py)**2,db=(paths[b].cx-px)**2+(paths[b].cy-py)**2;return da-db;});
  const order=[...containing, ...byDist.filter(pi=>!containing.includes(pi))];
  const pick=order.find(pi=>!taken[pi]);
  if(pick!=null){ taken[pick]=true; pathCode[pick]=dotCode[di]; }
}
// Tracés restants (îles/fragments) : code du point-préfecture le plus proche du centroïde
for(let pi=0; pi<paths.length; pi++){
  if(pathCode[pi]) continue;
  let best=null,bd=1e18;
  for(let di=0; di<dots.length; di++){ const dx=paths[pi].cx-dots[di][0], dy=paths[pi].cy-dots[di][1]; const d=dx*dx+dy*dy; if(d<bd){bd=d;best=di;} }
  pathCode[pi]=dotCode[best];
}

// ---------- 5bis. Correction déterministe Île-de-France ----------
// Les micro-départements (petite couronne) sont trop petits pour un rattachement fiable par point.
// On identifie chaque tracé IDF par sa géométrie (cf. inventaire) et on force le code.
// Indices stables (ordre de parsing du groupe France).
// #51/#52 : minuscules fragments réellement dans l'Oise (60, Hauts-de-France), pas en IDF.
const IDF_OVERRIDE = { 57:'78', 66:'77', 67:'95', 68:'93', 69:'92', 70:'75', 71:'94', 72:'91', 51:'60', 52:'60' };
for(const [pi,code] of Object.entries(IDF_OVERRIDE)) pathCode[+pi]=code;

// ---------- 6. Contrôles ----------
const covered = new Set(pathCode); const missing = codes.filter(c=>!covered.has(c));
console.log('codes couverts:', covered.size, '/96  manquants:', missing.join(',')||'aucun');

function extremePath(sel){ let bi=0; for(let i=1;i<paths.length;i++) if(sel(paths[i],paths[bi])) bi=i; return {code:pathCode[bi],c:[paths[bi].cx.toFixed(0),paths[bi].cy.toFixed(0)]}; }
console.log('Ouest  (min cx):', extremePath((a,b)=>a.cx<b.cx), '-> attendu Finistère(29)');
console.log('Est    (max cx):', extremePath((a,b)=>a.cx>b.cx), '-> attendu Bas-Rhin(67)/Corse');
console.log('Nord   (min cy):', extremePath((a,b)=>a.cy<b.cy), '-> attendu Nord(59)');
console.log('Sud    (max cy):', extremePath((a,b)=>a.cy>b.cy), '-> attendu Corse/PyrénéesOr(66)');

const idf=['75','92','93','94','78','91','95','77'];
console.log('Île-de-France (dot svg):'); for(const c of idf) console.log('  ',c,PREF[c][0],dotByCode[c]?.map(v=>v.toFixed(0)));

writeFileSync('tools/labels.json', JSON.stringify({pathCode, dotCode, dots}, null, 0));
console.log('-> tools/labels.json écrit');
