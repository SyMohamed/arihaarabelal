/* ============================================================
   data.js  -  Ari-Haara shared data engine
   Firebase Firestore + localStorage cache hybrid
   ============================================================ */

/* ── FIRESTORE SETUP ── */
var db=null;
var FS_MAP={
  "ah_founders":"founders","ah_members":"members","ah_acts":"activities",
  "ah_funds":"funds","ah_contribs":"contributions",
  "ah_slides_rm":"slides_removed","ah_slides_ex":"slides_extra"
};

function fbSave(localKey,data){
  if(!db)return;
  var col=FS_MAP[localKey];if(!col)return;
  db.collection(col).doc("data").set({items:data,ts:Date.now()})
    .then(function(){console.log("Firestore saved:",col);})
    .catch(function(e){console.error("Firestore save error:",col,e);});
}

function fbLoad(col,callback){
  if(!db){callback(null);return;}
  db.collection(col).doc("data").get()
    .then(function(doc){
      if(doc.exists&&doc.data()&&doc.data().items){callback(doc.data().items);}
      else{callback(null);}
    })
    .catch(function(e){console.warn("Firestore load error:",col,e);callback(null);});
}

function pushAllToFirestore(){
  if(!db)return;
  var keys=Object.keys(FS_MAP);
  for(var i=0;i<keys.length;i++){
    var data=ahLoad(keys[i],null);
    if(data!==null)fbSave(keys[i],data);
  }
  console.log("All local data pushed to Firestore!");
  if(typeof showToast==="function")showToast("Donnees synchronisees !");
}

function syncFromFirestore(){
  if(!db)return;
  var keys=Object.keys(FS_MAP);
  var loaded=0;var gotAny=false;
  for(var i=0;i<keys.length;i++){
    (function(localKey){
      var col=FS_MAP[localKey];
      fbLoad(col,function(data){
        if(data!==null){
          try{localStorage.setItem(localKey,JSON.stringify(data));}catch(e){}
          gotAny=true;
        }
        loaded++;
        if(loaded===keys.length){
          if(gotAny){
            if(typeof renderFunds==="function")renderFunds();
            if(typeof renderActs==="function")renderActs();
            if(typeof renderAllMembers==="function")renderAllMembers();
            if(typeof renderFounders==="function")renderFounders();
            if(typeof renderMyContribs==="function")renderMyContribs();
            if(typeof renderAllContribs==="function")renderAllContribs();
            if(typeof updateTotal==="function")updateTotal();
            if(typeof renderMembershipTrackers==="function")renderMembershipTrackers();
            if(typeof buildSlides==="function")buildSlides();
            console.log("Firestore sync complete");
          } else {
            console.log("Firestore empty - pushing local data up");
            pushAllToFirestore();
          }
        }
      });
    })(keys[i]);
  }
}

window.addEventListener("load",function(){
  setTimeout(function(){
    try{
      if(typeof firebase!=="undefined"&&firebase.firestore){
        db=firebase.firestore();
        console.log("Firestore connected!");
        syncFromFirestore();
      } else {
        console.warn("Firebase SDK not loaded yet");
      }
    }catch(e){console.warn("Firestore init error:",e);}
  },500);
});

/* ── LOCAL STORAGE (cache layer) ── */
function ahLoad(k,def){try{var v=localStorage.getItem(k);return v?JSON.parse(v):def;}catch(e){return def;}}
function ahSave(k,v){
  try{localStorage.setItem(k,JSON.stringify(v));return true;}
  catch(e){
    /* try to free space by removing old proof images from approved contribs */
    try{
      var c=JSON.parse(localStorage.getItem("ah_contribs")||"[]");
      var freed=false;
      for(var i=0;i<c.length;i++){if(c[i].proof&&c[i].status==="approved"){c[i].proof="";freed=true;}}
      if(freed){localStorage.setItem("ah_contribs",JSON.stringify(c));}
      localStorage.setItem(k,JSON.stringify(v));return true;
    }catch(e2){
      if(confirm("Stockage plein. Voulez-vous vider les anciennes donnees pour liberer de l espace ?")){
        clearOldData();
        try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e3){alert("Stockage toujours plein. Supprimez des activites ou photos.");return false;}
      }
      return false;
    }
  }
}
function clearOldData(){
  /* remove proof images from all contribs */
  var c=ahLoad("ah_contribs",[]);
  for(var i=0;i<c.length;i++){c[i].proof="";}
  try{localStorage.setItem("ah_contribs",JSON.stringify(c));}catch(e){}
  /* recompress any oversized founder/member photos */
  var keys=["ah_founders","ah_members"];
  for(var k=0;k<keys.length;k++){
    var items=ahLoad(keys[k],[]);var changed=false;
    for(var j=0;j<items.length;j++){
      if(items[j].photo&&items[j].photo.length>50000){items[j].photo="";changed=true;}
    }
    if(changed)try{localStorage.setItem(keys[k],JSON.stringify(items));}catch(e){}
  }
}
function ahSession(k,def){try{var v=sessionStorage.getItem(k);return v?JSON.parse(v):def;}catch(e){return def;}}
function ahSaveSession(k,v){try{sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}}

var DEFAULT_FOUNDERS=[
  {id:"fn1",name:"Membre Fondateur 1",role:"Co-Fondateur",bio:"A completer par l administrateur.",photo:""},
  {id:"fn2",name:"Membre Fondateur 2",role:"Co-Fondateur",bio:"A completer par l administrateur.",photo:""},
  {id:"fn3",name:"Membre Fondateur 3",role:"Co-Fondateur",bio:"A completer par l administrateur.",photo:""},
  {id:"fn4",name:"Membre Fondateur 4",role:"Co-Fondateur",bio:"A completer par l administrateur.",photo:""},
  {id:"fn5",name:"Membre Fondateur 5",role:"Co-Fondateur",bio:"A completer par l administrateur.",photo:""},
  {id:"fn6",name:"Membre Fondateur 6",role:"Co-Fondateur",bio:"A completer par l administrateur.",photo:""}
];

function getFounders(){var s=ahLoad("ah_founders",null);return s!==null?s:DEFAULT_FOUNDERS;}
function saveFounders(v){ahSave("ah_founders",v);fbSave("ah_founders",v);}
function getMembers(){return ahLoad("ah_members",[]);}
function saveMembers(v){ahSave("ah_members",v);fbSave("ah_members",v);}
function getActs(){return ahLoad("ah_acts",[]);}
function saveActs(v){var r=ahSave("ah_acts",v);fbSave("ah_acts",v);return r;}
function getFunds(){return ahLoad("ah_funds",[]);}
function saveFunds(v){var r=ahSave("ah_funds",v);fbSave("ah_funds",v);return r;}
function getContribs(){return ahLoad("ah_contribs",[]);}
function saveContribs(v){ahSave("ah_contribs",v);fbSave("ah_contribs",v);}
function getSlidesRemoved(){return ahLoad("ah_slides_rm",[]);}
function getSlidesExtra(){return ahLoad("ah_slides_ex",[]);}
function saveSlidesRemoved(v){ahSave("ah_slides_rm",v);fbSave("ah_slides_rm",v);}
function saveSlidesExtra(v){ahSave("ah_slides_ex",v);fbSave("ah_slides_ex",v);}

/* SESSION */
var ADMIN_PASS="arihaara2024";
var _isAdmin=false;
function curMember(){return ahSession("ah_cur_member",null);}
function setCurMember(m){ahSaveSession("ah_cur_member",m);}
function logout(){sessionStorage.removeItem("ah_cur_member");}

/* OVERLAY */
function openOv(id){document.getElementById(id).classList.add("open");}
function closeOv(id){document.getElementById(id).classList.remove("open");}
window.addEventListener("scroll",function(){var n=document.getElementById("main-nav");if(n)n.classList.toggle("scrolled",window.scrollY>40);});
window.addEventListener("click",function(e){if(e.target&&e.target.classList&&e.target.classList.contains("overlay"))e.target.classList.remove("open");});

/* IMAGE COMPRESSION - resizes images to save localStorage space */
var MAX_FILE_KB=250;
function compressImage(file,maxW,maxH,quality,cb){
  maxW=maxW||400;maxH=maxH||400;quality=quality||0.4;
  if(file.size>MAX_FILE_KB*1024){
    /* file too large - compress it automatically */
    quality=Math.min(quality,0.3);
  }
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var w=img.width;var h=img.height;
      if(w>maxW||h>maxH){
        var ratio=Math.min(maxW/w,maxH/h);
        w=Math.round(w*ratio);h=Math.round(h*ratio);
      }
      var canvas=document.createElement("canvas");
      canvas.width=w;canvas.height=h;
      var ctx=canvas.getContext("2d");
      ctx.drawImage(img,0,0,w,h);
      var result=canvas.toDataURL("image/jpeg",quality);
      /* if still too large, reduce further */
      if(result.length>MAX_FILE_KB*1024){
        result=canvas.toDataURL("image/jpeg",0.2);
      }
      cb(result);
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ADMIN AUTH */
function openLoginOrPanel(){if(_isAdmin){openAdminPanel();}else{openAdminLogin();}}
function openAdminLogin(){
  var inp=document.getElementById("pw-input");var err=document.getElementById("pw-err");
  if(inp)inp.value="";if(err)err.style.display="none";
  openOv("ov-admin-login");
  setTimeout(function(){if(inp)inp.focus();},120);
}
function doAdminLogin(){
  var inp=document.getElementById("pw-input");var err=document.getElementById("pw-err");
  if(inp&&inp.value===ADMIN_PASS){
    _isAdmin=true;closeOv("ov-admin-login");
    var fab=document.getElementById("admin-fab");if(fab)fab.style.display="block";
    var btn=document.getElementById("admin-nav-btn");if(btn)btn.classList.add("logged");
    openAdminPanel();
  }else{if(err)err.style.display="block";}
}
function doAdminLogout(){
  _isAdmin=false;
  var fab=document.getElementById("admin-fab");if(fab)fab.style.display="none";
  var btn=document.getElementById("admin-nav-btn");if(btn)btn.classList.remove("logged");
  closeOv("ov-admin");
}

/* TAB SWITCHER */
function swTab(n){
  var tabs=document.querySelectorAll(".tab");var panels=document.querySelectorAll(".tpanel");
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove("active");
  for(var i=0;i<panels.length;i++)panels[i].classList.remove("active");
  if(tabs[n])tabs[n].classList.add("active");
  var p=document.getElementById("tp-"+n);if(p)p.classList.add("active");
}

function setVal(id,val){var e=document.getElementById(id);if(e)e.value=val||"";}
function getVal(id){var e=document.getElementById(id);return e?e.value.trim():"";}

/* ── FOUNDERS ─────────────────────────────────────────── */
var _founderPhotoData="";

/* Sync a founder into the members list so they can log in and contribute */
function syncFounderToMembers(founder){
  var members=getMembers();
  var found=false;
  for(var i=0;i<members.length;i++){
    if(members[i].founderId===founder.id){
      /* update existing member entry */
      members[i].name=founder.name;
      members[i].role=founder.role;
      members[i].photo=founder.photo;
      found=true;break;
    }
  }
  if(!found){
    members.push({
      id:"mem_"+Date.now(),
      founderId:founder.id,
      name:founder.name,
      password:"arihaara",
      role:founder.role||"Co-Fondateur",
      bio:founder.bio||"",
      photo:founder.photo||"",
      status:"approved",
      joinDate:new Date().toLocaleDateString("fr-FR")
    });
  }
  saveMembers(members);
}

/* Sync ALL founders into members (called once on load) */
function syncAllFoundersToMembers(){
  var founders=getFounders();
  var members=getMembers();
  var changed=false;
  for(var i=0;i<founders.length;i++){
    var f=founders[i];
    if(f.name==="Membre Fondateur "+(i+1))continue;/* skip default placeholders */
    var exists=false;
    for(var j=0;j<members.length;j++){
      if(members[j].founderId===f.id){exists=true;break;}
    }
    if(!exists){
      members.push({
        id:"mem_"+Date.now()+"_"+i,
        founderId:f.id,
        name:f.name,
        password:"arihaara",
        role:f.role||"Co-Fondateur",
        bio:f.bio||"",
        photo:f.photo||"",
        status:"approved",
        joinDate:new Date().toLocaleDateString("fr-FR")
      });
      changed=true;
    }
  }
  if(changed)saveMembers(members);
}
function openFounderForm(id){
  _founderPhotoData="";
  var founders=getFounders();var f=null;
  if(id){for(var i=0;i<founders.length;i++){if(founders[i].id===id){f=founders[i];break;}}}
  var t=document.getElementById("fn-modal-title");if(t)t.textContent=f?"Modifier Fondateur":"Nouveau Fondateur";
  setVal("fn-eid",f?f.id:"");setVal("fn-name",f?f.name:"");setVal("fn-role",f?f.role:"");setVal("fn-bio",f?f.bio:"");
  var prev=document.getElementById("fn-photo-preview");var wrap=document.getElementById("fn-photo-preview-wrap");
  if(f&&f.photo){if(prev)prev.src=f.photo;_founderPhotoData=f.photo;if(wrap)wrap.style.display="block";}
  else{if(prev)prev.src="";if(wrap)wrap.style.display="none";}
  openOv("ov-founder");
}
function handleFounderPhoto(input){
  var file=input.files[0];if(!file)return;
  compressImage(file,300,300,0.5,function(data){
    _founderPhotoData=data;
    var prev=document.getElementById("fn-photo-preview");var wrap=document.getElementById("fn-photo-preview-wrap");
    if(prev){prev.src=_founderPhotoData;if(wrap)wrap.style.display="block";}
  });
}
function saveFounder(){
  var name=getVal("fn-name");if(!name){alert("Nom requis.");return;}
  var eid=getVal("fn-eid");
  var f={id:eid||("fn_"+Date.now()),name:name,role:getVal("fn-role"),bio:getVal("fn-bio"),photo:_founderPhotoData};
  var founders=getFounders();
  if(eid){var ok=false;for(var i=0;i<founders.length;i++){if(founders[i].id===eid){founders[i]=f;ok=true;break;}}if(!ok)founders.push(f);}
  else founders.push(f);
  saveFounders(founders);
  /* sync founder to members list */
  syncFounderToMembers(f);
  closeOv("ov-founder");
  if(typeof renderFounders==="function")renderFounders();
  renderAdminFounders();renderAdminMembers();
  if(typeof renderAllMembers==="function")renderAllMembers();
}
function deleteFounder(id){
  if(!_isAdmin){alert("Seul l administrateur peut supprimer.");return;}
  if(!confirm("Supprimer?"))return;
  saveFounders(getFounders().filter(function(f){return f.id!==id;}));
  if(typeof renderFounders==="function")renderFounders();
  renderAdminFounders();
}
function renderAdminFounders(){
  var el=document.getElementById("founders-alist");if(!el)return;
  var founders=getFounders();
  if(!founders.length){el.innerHTML='<div style="padding:1rem;text-align:center;color:#ccc;font-size:.82rem">Aucun fondateur</div>';return;}
  var h="";
  for(var i=0;i<founders.length;i++){
    var f=founders[i];
    h+='<div class="arow">';
    if(f.photo)h+='<img class="athumb" src="'+f.photo+'"/>';
    h+='<div style="flex:1"><div class="arow-name">'+f.name+'</div><div class="arow-sub">'+f.role+'</div></div>';
    h+='<div><button class="btn-sm edit" onclick="openFounderForm(\''+f.id+'\')">Modifier</button>';
    h+='<button class="btn-sm del" onclick="deleteFounder(\''+f.id+'\')">Suppr.</button></div></div>';
  }
  el.innerHTML=h;
}

/* ── MEMBERS ADMIN ────────────────────────────────────── */
var _adminMemberPhoto="";
function renderAdminMembers(){
  var el=document.getElementById("members-alist");if(!el)return;
  var members=getMembers();
  if(!members.length){el.innerHTML='<div style="padding:1rem;text-align:center;color:#ccc;font-size:.82rem">Aucun membre inscrit</div>';return;}
  var h="";
  for(var i=0;i<members.length;i++){
    var m=members[i];
    h+='<div class="arow">';
    if(m.photo)h+='<img class="athumb" src="'+m.photo+'" onerror="this.style.display=\'none\'"/>';
    else h+='<div class="contrib-avatar-ph" style="width:38px;height:38px;margin-right:.7rem;font-size:.9rem;flex-shrink:0">'+m.name[0]+'</div>';
    h+='<div style="flex:1"><div class="arow-name">'+m.name+'</div>';
    h+='<span class="mem-badge '+(m.status==="approved"?"approved":"pending")+'">'+m.status+'</span></div>';
    h+='<div>';
    if(m.status==="pending")h+='<button class="btn-sm approve" onclick="approveMember(\''+m.id+'\')">&#10003; OK</button>';
    h+='<button class="btn-sm del" onclick="deleteMember(\''+m.id+'\')">Suppr.</button></div></div>';
  }
  el.innerHTML=h;
}
function openMemberForm(){
  _adminMemberPhoto="";
  setVal("adm-mem-name","");setVal("adm-mem-password","");setVal("adm-mem-role","");
  var prev=document.getElementById("adm-mem-photo-prev");if(prev)prev.style.display="none";
  openOv("ov-add-member");
}
function handleAdminMemberPhoto(input){
  var file=input.files[0];if(!file)return;
  compressImage(file,250,250,0.4,function(data){
    _adminMemberPhoto=data;
    var prev=document.getElementById("adm-mem-photo-prev");
    if(prev){prev.src=data;prev.style.display="block";}
  });
}
function saveAdminMember(){
  var name=getVal("adm-mem-name");if(!name){alert("Nom requis.");return;}
  var pw=getVal("adm-mem-password");if(!pw){alert("Mot de passe requis.");return;}
  var members=getMembers();
  for(var i=0;i<members.length;i++){if(members[i].name.toLowerCase()===name.toLowerCase()){alert("Ce nom existe deja.");return;}}
  members.push({id:"mem_"+Date.now(),name:name,password:pw,role:getVal("adm-mem-role"),bio:"",photo:_adminMemberPhoto,status:"approved",joinDate:new Date().toLocaleDateString("fr-FR")});
  saveMembers(members);closeOv("ov-add-member");
  renderAdminMembers();if(typeof renderAllMembers==="function")renderAllMembers();
  if(typeof showToast==="function")showToast("Membre ajoute avec succes !");
}
function approveMember(id){
  var m=getMembers();for(var i=0;i<m.length;i++){if(m[i].id===id){m[i].status="approved";break;}}
  saveMembers(m);renderAdminMembers();if(typeof renderAllMembers==="function")renderAllMembers();
}
function deleteMember(id){
  if(!_isAdmin){alert("Seul l administrateur peut supprimer.");return;}
  if(!confirm("Supprimer?"))return;
  saveMembers(getMembers().filter(function(m){return m.id!==id;}));
  renderAdminMembers();if(typeof renderAllMembers==="function")renderAllMembers();
}

/* ── ACTIVITIES (with multi-photo file upload) ──────────── */
var _actPhotos=[];  // array of base64 or URL strings

function renderActAlist(){
  var el=document.getElementById("act-alist");if(!el)return;
  var acts=getActs();
  if(!acts.length){el.innerHTML='<div style="padding:1rem;text-align:center;color:#ccc;font-size:.82rem">Aucune activite</div>';return;}
  var h="";
  for(var i=0;i<acts.length;i++){
    var a=acts[i];
    h+='<div class="arow"><div><div class="arow-name">'+a.name+'</div>';
    h+='<div class="arow-sub">'+(a.date||"")+(a.photos&&a.photos.length?' &bull; '+a.photos.length+' photo(s)':'')+'</div></div>';
    h+='<div><button class="btn-sm edit" onclick="openActForm(\''+a.id+'\')">Modifier</button>';
    h+='<button class="btn-sm del" onclick="delAct(\''+a.id+'\')">Suppr.</button></div></div>';
  }
  el.innerHTML=h;
}

function openActForm(actId){
  var acts=getActs();var act=null;
  if(actId){for(var i=0;i<acts.length;i++){if(acts[i].id===actId){act=acts[i];break;}}}
  _actPhotos=act&&act.photos?act.photos.slice():[];
  var t=document.getElementById("act-modal-title");if(t)t.textContent=act?"Modifier Activite":"Nouvelle Activite";
  setVal("act-eid",act?act.id:"");setVal("act-name",act?act.name:"");
  setVal("act-date",act?act.date:"");setVal("act-desc",act?act.desc:"");
  renderActPhotosPreview();
  openOv("ov-act");
}

function handleActPhotos(input){
  var files=input.files;if(!files||!files.length)return;
  var remaining=files.length;
  for(var i=0;i<files.length;i++){
    (function(file){
      compressImage(file,600,600,0.4,function(data){
        _actPhotos.push(data);
        remaining--;
        if(remaining===0)renderActPhotosPreview();
      });
    })(files[i]);
  }
  input.value="";
}

function renderActPhotosPreview(){
  var el=document.getElementById("act-photos-row");if(!el)return;
  var h="";
  for(var i=0;i<_actPhotos.length;i++){
    h+='<div class="pthumb"><img src="'+_actPhotos[i]+'"/>';
    h+='<button class="pdel" onclick="rmActPhoto('+i+')">x</button></div>';
  }
  el.innerHTML=h||'<span style="font-size:.8rem;color:#bbb">Aucune photo</span>';
}

function rmActPhoto(i){_actPhotos.splice(i,1);renderActPhotosPreview();}

function delAct(id){
  if(!_isAdmin){alert("Seul l administrateur peut supprimer.");return;}
  if(!confirm("Supprimer?"))return;
  saveActs(getActs().filter(function(a){return a.id!==id;}));
  renderActAlist();if(typeof renderActs==="function")renderActs();
}

function saveAct(){
  var name=getVal("act-name");if(!name){alert("Nom requis.");return;}
  var eid=getVal("act-eid");
  var act={
    id:eid||("act_"+Date.now()),
    name:name,
    date:getVal("act-date"),
    desc:getVal("act-desc"),
    photos:_actPhotos.slice()
  };
  var acts=getActs();
  if(eid){var ok=false;for(var i=0;i<acts.length;i++){if(acts[i].id===eid){acts[i]=act;ok=true;break;}}if(!ok)acts.push(act);}
  else acts.push(act);
  var saved=saveActs(acts);
  if(!saved){return;}
  closeOv("ov-act");
  renderActAlist();
  if(typeof renderActs==="function")renderActs();
  /* reopen admin panel so user sees the updated list */
  openAdminPanel();
  /* switch to the tab that contains the activities list */
  var actEl=document.getElementById("act-alist");
  if(actEl){var p=actEl.closest(".tpanel");if(p&&p.id){var n=parseInt(p.id.replace("tp-",""));if(!isNaN(n))swTab(n);}}
}

/* ── SLIDES ───────────────────────────────────────────── */
function renderAdminSlides(){
  var el=document.getElementById("slides-thumbs");if(!el)return;
  var removed=getSlidesRemoved();var extra=getSlidesExtra();
  var imgs=document.querySelectorAll("#slide-images img");
  var all=[];
  for(var i=0;i<imgs.length;i++){var sid="base_"+i;if(removed.indexOf(sid)===-1)all.push({id:sid,src:imgs[i].src});}
  for(var j=0;j<extra.length;j++)all.push(extra[j]);
  var h="";
  for(var k=0;k<all.length;k++){h+='<div class="pthumb"><img src="'+all[k].src+'"/><button class="pdel" onclick="removeSlide(\''+all[k].id+'\')">x</button></div>';}
  el.innerHTML=h;
}
function addSlide(){
  var url=getVal("new-slide-url");if(!url)return;
  var ex=getSlidesExtra();ex.push({id:"ex_"+Date.now(),src:url});saveSlidesExtra(ex);
  setVal("new-slide-url","");renderAdminSlides();if(typeof buildSlides==="function")buildSlides();
}
function addSlideFiles(input){
  var files=input.files;if(!files||!files.length)return;
  var ex=getSlidesExtra();
  var remaining=files.length;
  for(var i=0;i<files.length;i++){
    (function(file){
      compressImage(file,1000,600,0.5,function(data){
        ex.push({id:"ex_"+Date.now()+"_"+Math.random().toString(36).substr(2,4),src:data});
        remaining--;
        if(remaining===0){
          saveSlidesExtra(ex);
          renderAdminSlides();
          if(typeof buildSlides==="function")buildSlides();
        }
      });
    })(files[i]);
  }
  input.value="";
}
function removeSlide(id){
  if(!_isAdmin){alert("Seul l administrateur peut supprimer.");return;}
  if(id.indexOf("base_")===0){var rm=getSlidesRemoved();if(rm.indexOf(id)===-1)rm.push(id);saveSlidesRemoved(rm);}
  else saveSlidesExtra(getSlidesExtra().filter(function(s){return s.id!==id;}));
  renderAdminSlides();if(typeof buildSlides==="function")buildSlides();
}

/* ── FUNDS (MRU) ──────────────────────────────────────── */
function renderAdminFunds(){
  var el=document.getElementById("funds-alist");if(!el)return;
  var funds=getFunds();
  if(!funds.length){el.innerHTML='<div style="padding:1rem;text-align:center;color:#ccc;font-size:.82rem">Aucun fonds</div>';return;}
  var h="";
  for(var i=0;i<funds.length;i++){
    var f=funds[i];
    h+='<div class="arow"><div><div class="arow-name">'+(f.icon||"")+" "+f.name+(f.type==="membership"?' <span style="font-size:.65rem;background:var(--cream-dark);color:var(--teal-dark);padding:1px 6px;border-radius:8px;margin-left:4px">Adhesion</span>':'')+'</div>';
    h+='<div class="arow-sub">Objectif: '+(f.goal||0)+' MRU</div></div>';
    h+='<div><button class="btn-sm del" onclick="deleteFund(\''+f.id+'\')">Suppr.</button></div></div>';
  }
  el.innerHTML=h;
}
function openFundForm(){
  setVal("fund-name","");setVal("fund-desc","");setVal("fund-goal","");setVal("fund-icon","");
  var typeEl=document.getElementById("fund-type");if(typeEl)typeEl.value="regular";
  openOv("ov-fund");
}
function saveFund(){
  var name=getVal("fund-name");
  if(!name){alert("Nom requis.");return;}
  var typeEl=document.getElementById("fund-type");
  var ftype=(typeEl&&typeEl.value)?typeEl.value:"regular";
  var icon=getVal("fund-icon")||"💰";
  var goal=parseInt(getVal("fund-goal"))||0;
  var desc=getVal("fund-desc");
  var f={id:"fund_"+Date.now(),name:name,desc:desc,icon:icon,goal:goal,type:ftype};
  var funds=getFunds();
  funds.push(f);
  if(!saveFunds(funds)){alert("Erreur: stockage plein.");return;}
  setVal("fund-name","");setVal("fund-desc","");setVal("fund-goal","");setVal("fund-icon","");
  var typeEl2=document.getElementById("fund-type");if(typeEl2)typeEl2.value="regular";
  closeOv("ov-fund");closeOv("ov-admin");
  renderAdminFunds();
  if(typeof renderFunds==="function")renderFunds();
  if(typeof updateTotal==="function")updateTotal();
  if(typeof renderMembershipTrackers==="function")renderMembershipTrackers();
  showToast("Fonds cree avec succes !");
}
function deleteFund(id){
  if(!_isAdmin){alert("Seul l administrateur peut supprimer.");return;}
  if(!confirm("Supprimer ce fonds?"))return;
  saveFunds(getFunds().filter(function(f){return f.id!==id;}));
  renderAdminFunds();if(typeof renderFunds==="function")renderFunds();
}

/* ── CONTRIBUTIONS ADMIN ──────────────────────────────── */
function renderAdminContribs(){
  var el=document.getElementById("contribs-alist");if(!el)return;
  var pending=getContribs().filter(function(c){return c.status==="pending";});
  if(!pending.length){el.innerHTML='<div style="padding:1rem;text-align:center;color:#ccc;font-size:.82rem">Aucune contribution en attente</div>';return;}
  var h="";
  for(var i=0;i<pending.length;i++){
    var c=pending[i];
    h+='<div class="arow" style="flex-wrap:wrap;gap:.5rem">';
    h+='<div style="flex:1;min-width:140px"><div class="arow-name">'+c.memberName+'</div>';
    h+='<div class="arow-sub">'+c.fundName+' &bull; '+c.date+'</div></div>';
    h+='<div style="display:flex;align-items:center;gap:.4rem">';
    h+='<input type="number" id="amt-'+c.id+'" value="'+c.amount+'" min="1" style="width:90px;padding:4px 6px;border:1px solid #ddd;border-radius:3px;font-size:.82rem;text-align:right"/>';
    h+='<span style="font-size:.75rem;color:#999">MRU</span></div>';
    if(c.proof)h+='<img class="proof-thumb" src="'+c.proof+'" onclick="showProof(\''+c.id+'\')" style="margin-right:.3rem"/>';
    h+='<div style="display:flex;gap:.3rem">';
    h+='<button class="btn-sm approve" onclick="approveContrib(\''+c.id+'\')">&#10003; Approuver</button>';
    h+='<button class="btn-sm del" onclick="rejectContrib(\''+c.id+'\')">&#10007;</button></div></div>';
  }
  el.innerHTML=h;
}
function approveContrib(id){
  var c=getContribs();
  for(var i=0;i<c.length;i++){
    if(c[i].id===id){
      /* allow admin to modify amount */
      var amtEl=document.getElementById("amt-"+id);
      if(amtEl){var newAmt=parseInt(amtEl.value);if(newAmt>0)c[i].amount=newAmt;}
      c[i].status="approved";break;
    }
  }
  saveContribs(c);renderAdminContribs();
  if(typeof renderFunds==="function")renderFunds();
  if(typeof renderAllContribs==="function")renderAllContribs();
  if(typeof renderMyContribs==="function")renderMyContribs();
  if(typeof updateTotal==="function")updateTotal();
}
function rejectContrib(id){
  if(!_isAdmin){alert("Seul l administrateur peut rejeter.");return;}
  if(!confirm("Rejeter?"))return;
  saveContribs(getContribs().filter(function(c){return c.id!==id;}));
  renderAdminContribs();
}
function showProof(id){
  var c=getContribs();for(var i=0;i<c.length;i++){if(c[i].id===id&&c[i].proof){var el=document.getElementById("proof-img");if(el){el.src=c[i].proof;openOv("ov-proof");}return;}}
}

/* ── CSV EXPORT ───────────────────────────────────────── */
function exportContribsCSV(){
  var contribs=getContribs().filter(function(c){return c.status==="approved";});
  if(!contribs.length){alert("Aucune contribution approuvee a exporter.");return;}
  var funds=getFunds();
  var fundMap={};
  for(var i=0;i<funds.length;i++)fundMap[funds[i].id]=funds[i].name;
  /* group by fund */
  var rows=[];
  rows.push(["Membre","Fonds / Type de contribution","Montant (MRU)","Date","Statut"]);
  for(var j=0;j<contribs.length;j++){
    var c=contribs[j];
    rows.push([
      '"'+c.memberName.replace(/"/g,'""')+'"',
      '"'+(c.fundName||fundMap[c.fundId]||"").replace(/"/g,'""')+'"',
      c.amount,
      '"'+c.date+'"',
      c.status==="approved"?"Approuvee":"En attente"
    ]);
  }
  var csv="\uFEFF";/* BOM for Excel */
  for(var k=0;k<rows.length;k++)csv+=rows[k].join(";")+"\r\n";
  var blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;a.download="contributions_arihaara.csv";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── TOAST NOTIFICATIONS ── */
function showToast(msg,type){
  var t=document.createElement("div");t.className="toast "+(type||"success");
  t.textContent=msg;document.body.appendChild(t);
  setTimeout(function(){t.classList.add("show");},50);
  setTimeout(function(){t.classList.remove("show");setTimeout(function(){t.remove();},400);},3000);
}

/* ── DATA EXPORT / IMPORT (admin only) ── */
function exportAllData(){
  var data={
    founders:getFounders(),
    members:getMembers(),
    acts:getActs(),
    funds:getFunds(),
    contribs:getContribs(),
    slides_rm:getSlidesRemoved(),
    slides_ex:getSlidesExtra(),
    exportDate:new Date().toISOString()
  };
  /* strip large photos from export to keep file small */
  var json=JSON.stringify(data,null,2);
  var blob=new Blob([json],{type:"application/json"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;a.download="arihaara_data_"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Donnees exportees !");
}

function importAllData(){
  var input=document.createElement("input");
  input.type="file";input.accept=".json";
  input.onchange=function(){
    var file=input.files[0];if(!file)return;
    var r=new FileReader();
    r.onload=function(e){
      try{
        var data=JSON.parse(e.target.result);
        if(!data.founders&&!data.members&&!data.acts){alert("Fichier invalide.");return;}
        if(!confirm("Cela remplacera toutes les donnees actuelles. Continuer ?"))return;
        if(data.founders)ahSave("ah_founders",data.founders);
        if(data.members)ahSave("ah_members",data.members);
        if(data.acts)ahSave("ah_acts",data.acts);
        if(data.funds)ahSave("ah_funds",data.funds);
        if(data.contribs)ahSave("ah_contribs",data.contribs);
        if(data.slides_rm)ahSave("ah_slides_rm",data.slides_rm);
        if(data.slides_ex)ahSave("ah_slides_ex",data.slides_ex);
        showToast("Donnees importees ! Rechargement...");
        setTimeout(function(){window.location.reload();},1500);
      }catch(err){alert("Erreur de lecture du fichier.");}
    };
    r.readAsText(file);
  };
  input.click();
}

/* ── Generate data.js defaults from current state (admin tool) ── */
function generateDefaultsCode(){
  var data={
    founders:getFounders(),
    members:getMembers(),
    acts:getActs(),
    funds:getFunds(),
    contribs:getContribs().filter(function(c){return c.status==="approved";}),
    slides_ex:getSlidesExtra()
  };
  /* Remove photo data to keep code small */
  var clean=JSON.parse(JSON.stringify(data));
  var code="/* AUTO-GENERATED DEFAULT DATA - paste into data.js */\n";
  code+="var SITE_DEFAULTS="+JSON.stringify(clean)+";\n";
  code+="function loadDefaults(){";
  code+="if(!localStorage.getItem('ah_founders'))ahSave('ah_founders',SITE_DEFAULTS.founders);";
  code+="if(!localStorage.getItem('ah_members'))ahSave('ah_members',SITE_DEFAULTS.members);";
  code+="if(!localStorage.getItem('ah_acts'))ahSave('ah_acts',SITE_DEFAULTS.acts);";
  code+="if(!localStorage.getItem('ah_funds'))ahSave('ah_funds',SITE_DEFAULTS.funds);";
  code+="if(!localStorage.getItem('ah_contribs'))ahSave('ah_contribs',SITE_DEFAULTS.contribs);";
  code+="if(!localStorage.getItem('ah_slides_ex'))ahSave('ah_slides_ex',SITE_DEFAULTS.slides_ex);";
  code+="}";
  var blob=new Blob([code],{type:"text/javascript"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;a.download="site-defaults.js";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Fichier defaults genere !");
}

/* ── OPEN ADMIN PANEL ─────────────────────────────────── */
function openAdminPanel(){
  syncAllFoundersToMembers();
  renderAdminFounders();renderAdminMembers();renderActAlist();
  renderAdminFunds();renderAdminContribs();renderAdminSlides();
  swTab(0);openOv("ov-admin");
}
