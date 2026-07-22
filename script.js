(function(){
  "use strict";

  // ====== INSTELLINGEN VAN DE TEKENAVOND ======
  // Welke vaste dag van de week is de tekenavond? 0=zo 1=ma 2=di 3=wo 4=do 5=vr 6=za
  // Zet op null als er geen vaste wekelijkse dag is.
  var CLUB_WEEKDAY = null; // geen vaste wekelijkse dag
  // Extra losse data die ook op de kalender oplichten (bijv. een speciale avond):
  // "JJJJ-MM-DD", bijvoorbeeld "2026-07-18". Laat leeg als je die niet gebruikt.
  var CLUB_DATES = ["2026-08-19"];
  // ============================================

  // ====== JOUW SUPABASE-GEGEVENS — hier invullen ======
  var SUPABASE_URL    = "https://dihfvhexqsyjmrzmmzfl.supabase.co";   // je Project URL
  var SUPABASE_KEY    = "sb_publishable_ZI7Bo3-TsgmZXJLchjeqWA_ub6z3u2t";        // je Publishable key
  var SUPABASE_BUCKET = "Tekeningen";                     // exacte bucketnaam (let op hoofdletter!)
  var WACHTTIJD_MIN   = 3;   // minuten tussen twee inzendingen per apparaat
  // ====================================================

  // Is Supabase ingevuld én de bibliotheek geladen? (zo niet: site werkt gewoon door)
  var SB_KLAAR = SUPABASE_URL.indexOf("xxxxxxxx") === -1 &&
                 SUPABASE_KEY.indexOf("xxxxxxxx") === -1 &&
                 typeof window.supabase !== "undefined";
  var sb = SB_KLAAR ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  var COLORS = ["#2A2622","#E8543E","#F2B33D","#4CAF50","#2FA39A","#4E63C8",
                "#7E57C2","#D8568C","#8D5524","#F28C28","#0036A7","#000000"];
  var PAPER  = "#FBF8F1";

  // ---------- canvas drawing ----------
  var canvas = document.getElementById("pad");
  var ctx = canvas.getContext("2d");
  var drawing = false, last = null;
  var current = { color: COLORS[0], size: 7, erase: false };

  function fillPaper(){ ctx.fillStyle = PAPER; ctx.fillRect(0,0,canvas.width,canvas.height); }
  fillPaper();

  function pos(e){
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) * (canvas.width / r.width);
    var y = (e.clientY - r.top)  * (canvas.height / r.height);
    return {x:x, y:y};
  }
  function start(e){ drawing = true; last = pos(e); dot(last); e.preventDefault(); }
  function move(e){
    if(!drawing) return;
    var p = pos(e);
    ctx.strokeStyle = current.erase ? PAPER : current.color;
    ctx.lineWidth = current.erase ? current.size*2.2 : current.size;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke();
    last = p; e.preventDefault();
  }
  function dot(p){
    ctx.fillStyle = current.erase ? PAPER : current.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,(current.erase?current.size*1.1:current.size/2),0,Math.PI*2); ctx.fill();
  }
  function end(){ drawing = false; last = null; }

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  canvas.addEventListener("pointerleave", function(){ /* keep stroke if button still down handled by window pointerup */ });

  // ---------- tools ----------
  var swatchWrap = document.getElementById("swatches");
  COLORS.forEach(function(c,i){
    var b = document.createElement("button");
    b.className = "swatch"; b.style.background = c;
    b.setAttribute("aria-label","Kleur " + (i+1));
    b.setAttribute("aria-pressed", i===0 ? "true":"false");
    b.addEventListener("click", function(){
      current.color = c; current.erase = false;
      eraserBtn.setAttribute("aria-pressed","false");
      [].forEach.call(swatchWrap.children, function(s){ s.setAttribute("aria-pressed","false"); });
      b.setAttribute("aria-pressed","true");
    });
    swatchWrap.appendChild(b);
  });

  var sizeWrap = document.getElementById("sizes");
  [].forEach.call(sizeWrap.querySelectorAll(".sizebtn"), function(b){
    b.addEventListener("click", function(){
      current.size = parseInt(b.getAttribute("data-size"),10);
      [].forEach.call(sizeWrap.children, function(s){ s.setAttribute("aria-pressed","false"); });
      b.setAttribute("aria-pressed","true");
    });
  });

  var eraserBtn = document.getElementById("eraser");
  eraserBtn.addEventListener("click", function(){
    current.erase = !current.erase;
    eraserBtn.setAttribute("aria-pressed", current.erase ? "true":"false");
  });

  document.getElementById("clear").addEventListener("click", function(){ fillPaper(); });

  // ---------- toast ----------
  var toastEl = document.getElementById("toast"), toastT;
  function toast(msg){
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.classList.remove("show"); }, 2400);
  }

  // ---------- pinboard storage ----------
  var pins = document.getElementById("pins");
  var rots = [-3.5,2.5,-1.5,3,-2.5,1.5,-4,2];
  var trots = [-6,-3,4,2,-5,5];

  function escapeHtml(s){ return (s||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }

  // ---------- vergroot-weergave (lightbox) ----------
  var lb = document.getElementById("lightbox");
  var lbArt = document.getElementById("lightbox-art");
  var lbName = document.getElementById("lightbox-name");
  var lbDl = document.getElementById("lightbox-dl");
  var lbObjUrl = null;

  function safeName(n){ return (n||"").replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g,"-").toLowerCase() || "tekening"; }

  function openLightbox(opts){
    lbArt.innerHTML = "";
    if(lbObjUrl){ URL.revokeObjectURL(lbObjUrl); lbObjUrl = null; }
    if(opts.imgSrc){
      var img = document.createElement("img");
      img.src = opts.imgSrc; img.alt = "Tekening van " + (opts.name || "een bezoeker");
      lbArt.appendChild(img);
      lbDl.href = opts.imgSrc;
      var ext = (opts.imgSrc.split(".").pop() || "png").split("?")[0];
      lbDl.download = "tekenclub-" + safeName(opts.name) + "." + ext;
    } else if(opts.svgMarkup){
      lbArt.innerHTML = opts.svgMarkup;
      lbObjUrl = URL.createObjectURL(new Blob([opts.svgMarkup], {type:"image/svg+xml"}));
      lbDl.href = lbObjUrl;
      lbDl.download = "tekenclub-" + safeName(opts.name) + ".svg";
    }
    lbName.textContent = opts.name || "anoniem";
    lb.hidden = false;
    document.getElementById("lightbox-close").focus();
  }

  function closeLightbox(){
    lb.hidden = true;
    lbArt.innerHTML = "";
    if(lbObjUrl){ URL.revokeObjectURL(lbObjUrl); lbObjUrl = null; }
  }

  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  lb.addEventListener("click", function(e){ if(e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape" && !lb.hidden) closeLightbox(); });

  // maakt een tekening op het prikbord klikbaar én bedienbaar met toetsenbord
  function makeOpenable(fig, opts){
    fig.tabIndex = 0;
    fig.setAttribute("role", "button");
    fig.setAttribute("aria-label", "Open tekening van " + (opts.name || "een bezoeker") + " groot");
    fig.addEventListener("click", function(){ openLightbox(opts); });
    fig.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openLightbox(opts); }
    });
  }

  // de oude kaart van Weesp ook groot kunnen openen
  (function(){
    var wmap = document.getElementById("weesp-map");
    if(!wmap) return;
    var openW = function(){ openLightbox({ imgSrc: "afbeeldingen/weesp-atlas-van-loon.jpg", name: "Weesp — Atlas van Loon" }); };
    wmap.addEventListener("click", openW);
    wmap.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openW(); }
    });
  })();

  function makePin(rec, idx){
    var fig = document.createElement("figure");
    fig.className = "pin";
    fig.style.setProperty("--r", (rots[idx % rots.length]) + "deg");
    fig.style.setProperty("--tr", (trots[idx % trots.length]) + "deg");
    var img = document.createElement("img");
    img.src = rec.src || rec.dataUrl;
    img.alt = "Tekening van " + (rec.name || "een bezoeker");
    img.loading = "lazy";
    var cap = document.createElement("figcaption");
    cap.className = "who";
    var when = "";
    if(rec.createdAt){
      try { when = new Date(rec.createdAt).toLocaleDateString("nl-NL",{day:"numeric",month:"short"}); } catch(e){}
    }
    cap.innerHTML = escapeHtml(rec.name || "anoniem") + (when ? "<small>" + when + "</small>" : "");
    fig.appendChild(img); fig.appendChild(cap);
    makeOpenable(fig, { imgSrc: rec.src || rec.dataUrl, name: rec.name });
    return fig;
  }

  // ---------- prikbord laden ----------
  // uit Supabase als dat is ingesteld, anders uit tekeningen/manifest.json
  function loadFromManifest(){
    return fetch("tekeningen/manifest.json", {cache:"no-store"})
      .then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .then(function(list){
        if(!Array.isArray(list)) return [];
        return list.filter(function(it){ return it && it.bestand; })
                   .map(function(it){ return { name: it.naam || "", src: "tekeningen/" + it.bestand }; });
      })
      .catch(function(){ return []; });
  }

  function loadFromSupabase(){
    return sb.from("tekeningen")
      .select("*").order("created_at", { ascending: false }).limit(20)
      .then(function(res){
        if(res.error || !res.data) return [];
        return res.data.map(function(row){
          var pub = sb.storage.from(SUPABASE_BUCKET).getPublicUrl(row.bestand);
          return {
            id: row.id,
            name: row.naam || "",
            src: (pub && pub.data) ? pub.data.publicUrl : "",
            createdAt: row.created_at ? Date.parse(row.created_at) : null
          };
        });
      })
      .catch(function(){ return []; });
  }

  function loadBoard(){
    var bron = SB_KLAAR ? loadFromSupabase() : loadFromManifest();
    bron.then(function(list){
      pins.innerHTML = "";
      if(!list || list.length === 0){ renderFallback(); return; }
      list.forEach(function(r,i){ pins.appendChild(makePin(r,i)); });
    });
  }

  // ---------- tekening bewaren (download naar eigen apparaat) ----------
  function blank(){
    // herkent een vrijwel leeg vel, zodat een blanco blad niet wordt bewaard
    var d = ctx.getImageData(0,0,canvas.width,canvas.height).data;
    var ref = null, painted = 0;
    for(var i=0;i<d.length;i+=4*97){ // steekproef
      var key = d[i]+","+d[i+1]+","+d[i+2];
      if(ref===null) ref = key;
      else if(key!==ref){ painted++; if(painted>4) return false; }
    }
    return true;
  }

  function minutenNogTeWachten(){
    try {
      var t = parseInt(localStorage.getItem("laatste_inzending") || "0", 10);
      var over = WACHTTIJD_MIN * 60 * 1000 - (Date.now() - t);
      if(over > 0) return Math.ceil(over / 60000);
    } catch(e){}
    return 0;
  }

  document.getElementById("hang").addEventListener("click", function(){
    if(blank()){ toast("Het vel is nog leeg 🙂"); return; }
    if(!SB_KLAAR){ toast("Vul eerst je Supabase-gegevens in (bovenaan script.js)"); return; }
    var wacht = minutenNogTeWachten();
    if(wacht > 0){ toast("Nog even geduld — over " + wacht + " min mag je weer insturen"); return; }

    var knop = this;
    knop.disabled = true;
    toast("Bezig met insturen\u2026");
    var naam = (document.getElementById("artist").value || "").trim().slice(0,40);

    canvas.toBlob(function(blob){
      if(!blob){ knop.disabled = false; toast("Er ging iets mis, probeer opnieuw"); return; }
      var bestand = "tekening-" + Date.now() + "-" + Math.floor(Math.random()*1000) + ".png";
      sb.storage.from(SUPABASE_BUCKET).upload(bestand, blob, { contentType: "image/png" })
        .then(function(up){
          if(up.error) throw up.error;
          return sb.from("tekeningen").insert({ naam: naam, bestand: bestand });
        })
        .then(function(ins){
          if(ins.error) throw ins.error;
          try { localStorage.setItem("laatste_inzending", String(Date.now())); } catch(e){}
          fillPaper();
          document.getElementById("artist").value = "";
          toast("Op het prikbord gezet! \ud83c\udf89");
          loadBoard();
          var pb = document.getElementById("prikbord");
          if(pb) pb.scrollIntoView({ behavior: "smooth" });
        })
        .catch(function(err){
          toast("Insturen lukte niet \u2014 controleer je instellingen");
          if(window.console) console.error("Supabase:", err);
        })
        .then(function(){ knop.disabled = false; });
    }, "image/png");
  });

  // ---------- fallback-krabbels (alleen tonen als er nog NIETS hangt) ----------
  var starters = [
    {name:"Sanne", svg:'<rect width="100%" height="100%" fill="#FBF8F1"/><g fill="none" stroke="#E8543E" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><circle cx="152" cy="112" r="50"/><path d="M120 92 q-22 -26 -10 -44 M184 92 q22 -26 10 -44"/><circle cx="135" cy="108" r="5" fill="#E8543E"/><circle cx="169" cy="108" r="5" fill="#E8543E"/><path d="M132 132 q20 18 40 0 M152 162 v22 M152 184 q-26 8 -30 -10 M152 184 q26 8 30 -10"/></g>'},
    {name:"Joost", svg:'<rect width="100%" height="100%" fill="#FBF8F1"/><g fill="none" stroke="#2FA39A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M86 150 h132 v40 a16 16 0 0 1 -16 16 h-100 a16 16 0 0 1 -16 -16 Z"/><path d="M218 158 q34 0 34 22 q0 22 -34 22"/><path d="M118 150 q-8 -34 16 -40 M152 150 q-8 -40 18 -44 M186 150 q-8 -34 14 -38"/></g>'},
    {name:"Mees", svg:'<rect width="100%" height="100%" fill="#FBF8F1"/><g fill="none" stroke="#4E63C8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M152 60 l24 60 64 6 -50 42 16 64 -54 -36 -54 36 16 -64 -50 -42 64 -6 Z"/></g>'},
    {name:"Roos", svg:'<rect width="100%" height="100%" fill="#FBF8F1"/><g fill="none" stroke="#D8568C" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M152 196 v-46"/><circle cx="152" cy="118" r="30"/><path d="M152 88 a30 30 0 0 0 0 60 M152 88 a30 30 0 0 1 0 60 M122 118 h60"/><path d="M152 160 q-30 4 -34 30 M152 168 q30 4 34 28"/></g><g fill="none" stroke="#2FA39A" stroke-width="6" stroke-linecap="round"><path d="M120 196 h64"/></g>'}
  ];

  function renderFallback(){
    pins.innerHTML = "";
    starters.forEach(function(s,i){
      var fig = document.createElement("figure");
      fig.className = "pin";
      fig.style.setProperty("--r", (rots[i % rots.length]) + "deg");
      fig.style.setProperty("--tr", (trots[i % trots.length]) + "deg");
      var svgStr = '<svg viewBox="0 0 304 224" role="img" aria-label="Voorbeeldtekening">' + s.svg + '</svg>';
      fig.innerHTML = svgStr +
        '<figcaption class="who">' + escapeHtml(s.name) + '<small>voorbeeld</small></figcaption>';
      makeOpenable(fig, { svgMarkup: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 304 224">' + s.svg + '</svg>', name: s.name });
      pins.appendChild(fig);
    });
  }

  // ---------- kalender ----------
  var MAANDEN = ["januari","februari","maart","april","mei","juni",
                 "juli","augustus","september","oktober","november","december"];
  var DAGEN   = ["ma","di","wo","do","vr","za","zo"];

  function ymd(date){ // naar "JJJJ-MM-DD"
    var m = ("0"+(date.getMonth()+1)).slice(-2), d = ("0"+date.getDate()).slice(-2);
    return date.getFullYear() + "-" + m + "-" + d;
  }
  function isClubDay(date){
    if(CLUB_WEEKDAY !== null && date.getDay() === CLUB_WEEKDAY) return true;
    return CLUB_DATES.indexOf(ymd(date)) !== -1;
  }

  // zoekt vanaf vandaag de eerstvolgende tekenavond (vaste dag óf losse datum)
  function nextClubDate(maxDays){
    var d = new Date(); d.setHours(0,0,0,0);
    for(var i = 0; i < (maxDays || 366); i++){
      if(isClubDay(d)) return new Date(d);
      d.setDate(d.getDate() + 1);
    }
    return null;
  }

  // de kalender opent op de maand van de eerstvolgende tekenavond (anders deze maand)
  var view = new Date(); view.setDate(1);
  (function(){
    var nd = nextClubDate(366);
    if(nd) view = new Date(nd.getFullYear(), nd.getMonth(), 1);
  })();

  function renderCalendar(){
    var grid = document.getElementById("cal-grid");
    if(!grid) return;
    document.getElementById("cal-title").textContent =
      MAANDEN[view.getMonth()] + " " + view.getFullYear();
    grid.innerHTML = "";
    DAGEN.forEach(function(d){
      var el = document.createElement("div"); el.className = "cal-dow"; el.textContent = d;
      grid.appendChild(el);
    });
    var year = view.getFullYear(), month = view.getMonth();
    var first = new Date(year, month, 1);
    var leeg = (first.getDay() + 6) % 7;          // maandag-eerst
    var aantal = new Date(year, month + 1, 0).getDate();
    var today = new Date(); today.setHours(0,0,0,0);
    for(var i = 0; i < leeg; i++){
      var b = document.createElement("div"); b.className = "cal-cell blank"; grid.appendChild(b);
    }
    for(var d = 1; d <= aantal; d++){
      var cell = document.createElement("div");
      cell.className = "cal-cell"; cell.textContent = d;
      var date = new Date(year, month, d);
      if(isClubDay(date)){ cell.classList.add("club"); cell.title = "Tekenavond"; }
      if(date.getTime() === today.getTime()) cell.classList.add("today");
      grid.appendChild(cell);
    }
  }

  function showNextSession(){
    var el = document.getElementById("next-session");
    if(!el) return;
    var nd = nextClubDate(366);
    if(!nd){ el.textContent = ""; return; }
    var today = new Date(); today.setHours(0,0,0,0);
    var tekst = nd.toLocaleDateString("nl-NL", {weekday:"long", day:"numeric", month:"long"});
    el.textContent = (nd.getTime() === today.getTime()) ? "Vanavond! (" + tekst + ")" : "Eerstvolgende: " + tekst;
  }

  (function initCalendar(){
    var prev = document.getElementById("cal-prev"), next = document.getElementById("cal-next");
    if(prev) prev.addEventListener("click", function(){ view.setMonth(view.getMonth() - 1); renderCalendar(); });
    if(next) next.addEventListener("click", function(){ view.setMonth(view.getMonth() + 1); renderCalendar(); });
    renderCalendar();
    showNextSession();
  })();

  loadBoard();
})();
