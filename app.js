const STORAGE_KEY = "emotichat_diary_v1";
const $ = (id) => document.getElementById(id);

let selectedJournalEmotion = "";
let exerciseInterval = null;
let exerciseRemaining = 60;
let exerciseMode = "breathing";
let groundingStep = 0;

const guidance = {
  "Triste": {
    title: "Está bien sentir tristeza.",
    body: "La tristeza puede aparecer cuando algo nos duele, cambia o no sale como esperábamos. No tienes que ocultarla ni resolver todo de inmediato.",
    steps: ["Ponle nombre a lo que sientes: ¿qué es lo que más te pesa ahora?", "Si puedes, cuéntaselo a alguien con quien te sientas seguro/a.", "Elige una acción pequeña y amable contigo: descansar, tomar agua o escuchar música tranquila."],
    exercise: "Prueba la respiración pausada o escribe en tu diario qué te gustaría que alguien comprendiera."
  },
  "Ansioso/a": {
    title: "Vamos paso a paso.",
    body: "La ansiedad puede sentirse como preocupación, tensión o muchas ideas al mismo tiempo. No significa que estés haciendo algo mal.",
    steps: ["Apoya los pies en el suelo y observa dónde estás.", "Respira suavemente, sin forzar ni aguantar el aire.", "Piensa en una sola cosa pequeña que sí puedes hacer ahora."],
    exercise: "Puedes probar la respiración pausada y volver a tu entorno con el ejercicio de los cinco sentidos."
  },
  "Estresado/a": {
    title: "No tienes que resolverlo todo ahora.",
    body: "El estrés puede aparecer cuando sentimos muchas exigencias o poco tiempo. Hacer una pausa también forma parte de avanzar.",
    steps: ["Anota qué es urgente y qué puede esperar.", "Divide una tarea grande en un paso pequeño.", "Tómate una pausa breve y vuelve cuando te sientas preparado/a."],
    exercise: "Prueba una respiración lenta y luego elige una sola tarea para comenzar."
  },
  "Enojado/a": {
    title: "Tu enojo merece ser escuchado con cuidado.",
    body: "El enojo puede avisarte que algo te molestó o que un límite fue cruzado. Puedes reconocerlo sin lastimarte ni lastimar a alguien.",
    steps: ["Si es posible, toma distancia de la situación por un momento.", "Evita responder mientras la emoción esté muy intensa.", "Cuando estés listo/a, identifica qué necesitas o qué límite quieres comunicar."],
    exercise: "Aléjate un momento, relaja hombros y manos, y prueba una pausa de respiración."
  },
  "Solo/a": {
    title: "Mereces compañía y comprensión.",
    body: "Sentirse solo/a puede ser difícil, incluso cuando hay personas alrededor. Lo que sientes importa y no tienes que atravesarlo sin apoyo.",
    steps: ["Piensa en una persona adulta o de confianza con quien puedas hablar.", "Puedes empezar con una frase sencilla: «No me he sentido bien y necesito conversar».", "Si no te sientes escuchado/a, busca a otra persona segura, como un familiar, docente u orientador."],
    exercise: "Escribe en tu diario qué tipo de apoyo te gustaría recibir. También puedes revisar el directorio de ayuda."
  },
  "Con miedo": {
    title: "Vamos a buscar seguridad, un paso a la vez.",
    body: "El miedo puede aparecer cuando algo nos preocupa o no sabemos qué va a pasar. Si existe una situación que te pone en peligro, lo primero es buscar ayuda humana.",
    steps: ["Acércate a un adulto de confianza si no te sientes seguro/a.", "Busca un lugar seguro y evita enfrentar a solas una situación peligrosa.", "Si el miedo continúa o afecta tu día a día, pide orientación a un profesional."],
    exercise: "Si estás en un lugar seguro, puedes probar el ejercicio de los cinco sentidos."
  },
  "Feliz": {
    title: "Qué bueno que estés viviendo un momento agradable.",
    body: "Reconocer los momentos positivos también es parte de conocerte. Puedes guardar qué te hizo sentir así para recordarlo después.",
    steps: ["Identifica qué contribuyó a este momento.", "Si quieres, comparte tu alegría con alguien.", "Guarda en tu diario algo que te gustaría recordar."],
    exercise: "Puedes anotar tres cosas que aprecias de este momento."
  },
  "Confundido/a": {
    title: "No siempre tenemos que entenderlo todo de inmediato.",
    body: "A veces aparecen varias emociones a la vez. Date permiso para observar lo que pasa sin juzgarte.",
    steps: ["Pregúntate: ¿qué ocurrió antes de sentirme así?", "Identifica si hay más de una emoción presente.", "Habla con alguien de confianza si necesitas ordenar tus ideas."],
    exercise: "Escribir libremente unos minutos puede ayudarte a aclarar lo que estás pensando."
  }
};

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function formatDate(iso) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
function renderHistory() {
  const records = loadRecords().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  $("recordCount").textContent = `${records.length} ${records.length === 1 ? "registro" : "registros"}`;
  $("clearAll").hidden = records.length === 0;
  const list = $("journalHistory");
  if (!records.length) {
    list.innerHTML = '<div class="empty-state"><span>📖</span><strong>Tu diario empieza aquí</strong><p>Cuando guardes tu primer registro, aparecerá en esta sección.</p></div>';
    return;
  }
  list.innerHTML = records.map(record => `
    <article class="record">
      <div class="record-top"><span class="record-emotion">${escapeHtml(record.emotion)}</span><span class="record-date">${formatDate(record.createdAt)}</span></div>
      <div class="record-meta">Intensidad: ${escapeHtml(record.intensity)}</div>
      ${record.note ? `<p class="record-text">${escapeHtml(record.note)}</p>` : ""}
      <div class="record-top"><span></span><button class="delete-record" data-delete="${record.id}" type="button">Eliminar</button></div>
    </article>`).join("");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
$("journalEmotionGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-emotion]");
  if (!button) return;
  document.querySelectorAll("#journalEmotionGrid .emotion-choice").forEach(el => el.classList.remove("selected"));
  button.classList.add("selected");
  selectedJournalEmotion = button.dataset.emotion;
  $("selectedEmotion").value = selectedJournalEmotion;
});
$("journalText").addEventListener("input", () => $("charCount").textContent = `${$("journalText").value.length}/500`);
$("journalForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!selectedJournalEmotion) {
    $("journalStatus").textContent = "Primero selecciona una emoción.";
    return;
  }
  const intensity = $("intensity").value;
  if (!intensity) {
    $("journalStatus").textContent = "Selecciona la intensidad de la emoción.";
    return;
  }
  const records = loadRecords();
  records.push({ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, emotion: selectedJournalEmotion, intensity, note: $("journalText").value.trim(), createdAt: new Date().toISOString() });
  try {
    saveRecords(records);
    $("journalForm").reset();
    selectedJournalEmotion = "";
    document.querySelectorAll("#journalEmotionGrid .emotion-choice").forEach(el => el.classList.remove("selected"));
    $("charCount").textContent = "0/500";
    $("journalStatus").textContent = "Tu registro se guardó en este dispositivo.";
    renderHistory();
    renderDashboard();
  } catch {
    $("journalStatus").textContent = "No se pudo guardar. Revisa el espacio disponible en el navegador.";
  }
});
$("journalHistory").addEventListener("click", event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  saveRecords(loadRecords().filter(record => record.id !== button.dataset.delete));
  renderHistory();
  renderDashboard();
});
$("clearAll").addEventListener("click", () => {
  if (confirm("¿Quieres eliminar todos los registros guardados en este navegador? Esta acción no se puede deshacer.")) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    renderDashboard();
    $("journalStatus").textContent = "Se eliminaron tus registros.";
  }
});

$("guidanceEmotionGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-guidance]");
  if (!button) return;
  document.querySelectorAll("#guidanceEmotionGrid .emotion-choice").forEach(el => el.classList.remove("selected"));
  button.classList.add("selected");
  const item = guidance[button.dataset.guidance];
  $("guidanceResult").innerHTML = `
    <div><span class="eyebrow">UNA IDEA PARA ACOMPAÑARTE</span><h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.body)}</p><strong>¿Qué puedes intentar?</strong>
    <ol class="tip-list">${item.steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
    <p><strong>Una pausa posible:</strong> ${escapeHtml(item.exercise)}</p>
    <a class="text-link" href="#ejercicios">Ver ejercicios guiados ↓</a>
    <p class="small muted">Esta orientación es general y no sustituye una conversación con una persona de confianza o un profesional.</p></div>`;
});

function openExercise(mode) {
  stopExercise();
  exerciseMode = mode;
  $("exercisePanel").hidden = false;
  $("exercisePanel").scrollIntoView({ behavior: "smooth", block: "center" });
  $("timerStart").disabled = false;
  $("timerStop").disabled = true;
  $("timerNumber").textContent = mode === "breathing" ? "60" : "5";
  exerciseRemaining = mode === "breathing" ? 60 : 5;
  $("timerPhase").textContent = "Prepárate";
  $("timerInstruction").textContent = mode === "breathing" ? "Busca una postura cómoda. Comenzaremos cuando estés listo/a." : "Vamos a observar el entorno, sin prisa. Pulsa empezar cuando estés listo/a.";
  $("exerciseTitle").textContent = mode === "breathing" ? "Respiración pausada" : "Volver al presente";
  $("exerciseEyebrow").textContent = mode === "breathing" ? "1 MINUTO" : "5 SENTIDOS";
  $("breathCircle").className = "breath-circle";
  $("timerStatus").textContent = "";
}
$("startBreathing").addEventListener("click", () => openExercise("breathing"));
$("startGrounding").addEventListener("click", () => openExercise("grounding"));
$("closeExercise").addEventListener("click", () => { stopExercise(); $("exercisePanel").hidden = true; });
function stopExercise() {
  if (exerciseInterval) clearInterval(exerciseInterval);
  exerciseInterval = null;
  $("timerStop").disabled = true;
}
$("timerStart").addEventListener("click", () => {
  stopExercise();
  $("timerStart").disabled = true;
  $("timerStop").disabled = false;
  if (exerciseMode === "breathing") runBreathing();
  else runGrounding();
});
$("timerStop").addEventListener("click", () => {
  stopExercise();
  $("timerStart").disabled = false;
  $("timerPhase").textContent = "Pausa";
  $("timerInstruction").textContent = "El ejercicio se detuvo. Puedes volver a empezar cuando quieras.";
  $("breathCircle").className = "breath-circle";
});
function runBreathing() {
  let elapsed = 0;
  const total = 60;
  const update = () => {
    const remaining = total - elapsed;
    $("timerNumber").textContent = remaining;
    if (remaining <= 0) {
      stopExercise();
      $("timerPhase").textContent = "¡Listo!";
      $("timerInstruction").textContent = "Terminaste. Nota cómo te sientes, sin exigirte sentir algo en particular.";
      $("breathCircle").className = "breath-circle";
      $("timerStart").disabled = false;
      $("timerStop").disabled = true;
      $("timerStatus").textContent = "Ejercicio completado.";
      return;
    }
    const phasePosition = elapsed % 10;
    if (phasePosition < 4) {
      $("timerPhase").textContent = "Inhala";
      $("timerInstruction").textContent = "Inhala suavemente por la nariz durante 4 segundos. No fuerces el aire.";
      $("breathCircle").className = "breath-circle inhale";
    } else {
      $("timerPhase").textContent = "Exhala";
      $("timerInstruction").textContent = "Exhala lentamente durante 6 segundos. Suelta el aire sin esfuerzo.";
      $("breathCircle").className = "breath-circle exhale";
    }
    elapsed++;
  };
  update();
  exerciseInterval = setInterval(update, 1000);
}
const groundingPrompts = [
  "Mira a tu alrededor y nombra 5 cosas que puedas ver.",
  "Identifica 4 cosas que puedas sentir con el tacto.",
  "Escucha y reconoce 3 sonidos a tu alrededor.",
  "Identifica 2 olores que puedas percibir, si los hay.",
  "Reconoce 1 sabor o una sensación en tu boca. Respira con calma."
];
function runGrounding() {
  groundingStep = 0;
  $("timerNumber").textContent = "5";
  const showStep = () => {
    $("timerPhase").textContent = `Paso ${groundingStep + 1}`;
    $("timerInstruction").textContent = groundingPrompts[groundingStep];
    $("breathCircle").className = "breath-circle";
  };
  showStep();
  exerciseInterval = setInterval(() => {
    groundingStep++;
    $("timerNumber").textContent = String(Math.max(0, 5 - groundingStep));
    if (groundingStep >= 5) {
      stopExercise();
      $("timerPhase").textContent = "¡Bien hecho!";
      $("timerInstruction").textContent = "Terminaste la guía. Puedes repetirla o continuar con tu día a tu ritmo.";
      $("timerNumber").textContent = "✓";
      $("timerStart").disabled = false;
      $("timerStop").disabled = true;
      $("timerStatus").textContent = "Ejercicio completado.";
      return;
    }
    showStep();
  }, 8000);
}

$("menuToggle").addEventListener("click", () => {
  const nav = $("mainNav");
  const open = nav.classList.toggle("open");
  $("menuToggle").setAttribute("aria-expanded", String(open));
});
document.querySelectorAll("#mainNav a").forEach(link => link.addEventListener("click", () => {
  $("mainNav").classList.remove("open");
  $("menuToggle").setAttribute("aria-expanded", "false");
}));
renderHistory();


// Panel visual del diario: todos los indicadores se calculan desde los registros locales.
let moodLineChart = null;
let emotionDoughnut = null;
const emotionColors = {"Feliz":"#FFD36E","Tranquilo/a":"#79D9C0","Triste":"#8CAEF5","Ansioso/a":"#F39AB8","Estresado/a":"#F6A66D","Enojado/a":"#EF8585","Con miedo":"#B7A4EE","Confundido/a":"#A9C8D8"};
const intensityValue = {"Baja":1,"Media":2,"Alta":3};
function getDashboardRecords(){
  const all=loadRecords().filter(r=>r.createdAt&& !Number.isNaN(new Date(r.createdAt).getTime()));
  const period=$('chartPeriod')?.value||'30';
  if(period==='all') return all;
  const cutoff=new Date();cutoff.setHours(0,0,0,0);cutoff.setDate(cutoff.getDate()-Number(period)+1);
  return all.filter(r=>new Date(r.createdAt)>=cutoff);
}
function renderDashboard(){
  const records=getDashboardRecords().sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  $('statTotal').textContent=records.length;
  const counts={};records.forEach(r=>counts[r.emotion]=(counts[r.emotion]||0)+1);
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];$('statTop').textContent=top?`${top[0]} (${top[1]})`:'—';
  $('statDays').textContent=new Set(records.map(r=>new Date(r.createdAt).toLocaleDateString('en-CA'))).size;
  const grouped={};records.forEach(r=>{const day=new Date(r.createdAt).toLocaleDateString('en-CA');(grouped[day]??=[]).push(intensityValue[r.intensity]||2)});
  const labels=Object.keys(grouped);const values=labels.map(k=>grouped[k].reduce((a,b)=>a+b,0)/grouped[k].length);
  if(moodLineChart)moodLineChart.destroy();
  moodLineChart=new Chart($('moodLineChart'),{type:'line',data:{labels:labels.map(k=>new Date(k+'T12:00:00').toLocaleDateString('es-PE',{day:'numeric',month:'short'})),datasets:[{label:'Intensidad promedio',data:values,borderColor:'#45b3e3',backgroundColor:'rgba(105,190,233,.2)',fill:true,tension:.35,pointBackgroundColor:'#fff',pointBorderColor:'#45b3e3',pointRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`Intensidad: ${{1:'Baja',2:'Media',3:'Alta'}[Math.round(c.raw)]||c.raw.toFixed(1)}`}}},scales:{y:{min:0,max:3,ticks:{stepSize:1,callback:v=>({0:'—',1:'Baja',2:'Media',3:'Alta'}[v])},grid:{color:'#edf4f8'}},x:{grid:{display:false}}}}});
  if(emotionDoughnut)emotionDoughnut.destroy();
  const emotionLabels=Object.keys(counts);emotionDoughnut=new Chart($('emotionDoughnut'),{type:'doughnut',data:{labels:emotionLabels,datasets:[{data:emotionLabels.map(k=>counts[k]),backgroundColor:emotionLabels.map(k=>emotionColors[k]||'#9bcfe5'),borderWidth:3,borderColor:'#fff',hoverOffset:7}]},options:{responsive:true,maintainAspectRatio:false,cutout:'63%',plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:8,padding:12,font:{size:10}}}}}});
  const cal=$('moodCalendar');cal.innerHTML='';const today=new Date();const days=Number($('chartPeriod').value==='7'?7:30);const start=new Date(today);start.setHours(0,0,0,0);start.setDate(start.getDate()-days+1);
  for(let i=0;i<days;i++){const d=new Date(start);d.setDate(start.getDate()+i);const key=d.toLocaleDateString('en-CA');const rs=grouped[key]||[];const avg=rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:0;const cell=document.createElement('div');cell.className='calendar-day '+(!rs.length?'empty':avg<1.5?'low':avg<2.5?'medium':'high');cell.innerHTML=`<span>${d.toLocaleDateString('es-PE',{weekday:'short'}).slice(0,2)}</span><strong>${d.getDate()}</strong><span>${rs.length?(avg<1.5?'🩵':avg<2.5?'💙':'💜'):'·'}</span>`;cell.title=rs.length?`${rs.length} registro(s), intensidad promedio ${avg.toFixed(1)}`:'Sin registro';cal.appendChild(cell);}
}
$('chartPeriod').addEventListener('change',renderDashboard);
$('downloadReport').addEventListener('click',()=>{
 const records=getDashboardRecords().sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
 if(!records.length){alert('Todavía no hay registros para incluir en el informe.');return;}
 const rows=records.map(r=>`<tr><td>${escapeHtml(formatDate(r.createdAt))}</td><td>${escapeHtml(r.emotion)}</td><td>${escapeHtml(r.intensity)}</td><td>${escapeHtml(r.note||'—')}</td></tr>`).join('');
 const win=window.open('','_blank');if(!win){alert('Permite las ventanas emergentes para preparar el informe.');return;}
 win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe emocional - EmotiChat</title><style>body{font:14px Arial,sans-serif;color:#29465b;padding:30px}h1{color:#329acb}p{line-height:1.5;color:#526b7c}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #d8e8f0;padding:9px;text-align:left;vertical-align:top}th{background:#eaf8ff}small{color:#71899b}@media print{button{display:none}}</style></head><body><h1>EmotiChat · Informe de registros emocionales</h1><p>Periodo: ${records.length} registro(s). Generado el ${new Date().toLocaleString('es-PE')}.</p><p><strong>Importante:</strong> este documento resume lo que la persona registró. No constituye una evaluación clínica ni un diagnóstico. Debe ser interpretado por el profesional junto con la entrevista y otros antecedentes.</p><table><thead><tr><th>Fecha</th><th>Emoción</th><th>Intensidad</th><th>Nota personal</th></tr></thead><tbody>${rows}</tbody></table><p><small>Documento generado localmente desde el diario EmotiChat. Los datos no se envían a un servidor.</small></p><script>window.onload=()=>window.print()<\/script></body></html>`);win.document.close();
});
renderDashboard();
