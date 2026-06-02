/* ==========================================================================
   CONEXÃO COM O FIREBASE
   ========================================================================== */
const firebaseConfig = {
    apiKey: "AIzaSyAwCaQSkP-gEGgh-Adak-KB18e_afkw53E",
    authDomain: "rota-sustentavel.firebaseapp.com",
    databaseURL: "https://rota-sustentavel-default-rtdb.firebaseio.com",
    projectId: "rota-sustentavel",
    storageBucket: "rota-sustentavel.appspot.com",
    messagingSenderId: "688641307958",
    appId: "1:688641307958:web:5bd469b8a4d0c20e75ef97"
};

let useFirebase = false;
try {
    firebase.initializeApp(firebaseConfig);
    var database = firebase.database();
    useFirebase = true;
    document.getElementById('ranking-title-ui').innerText = "🏆 CLASSIFICAÇÃO GLOBAL (LIVE)";
} catch(e) {
    console.log("Firebase em modo local.");
}

/* ==========================================================================
   SINTETIZADOR DE SOM NATIVO (Efeitos Web Audio API)
   ========================================================================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSomClique() {
    try {
        let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(450, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(850, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.08);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
    } catch(e){}
}

function playSomBatida() {
    try {
        let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(160, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.22);
    } catch(e){}
}

function playSomColeta() {
    try {
        let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(550, audioCtx.currentTime);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.18);
    } catch(e){}
}

/* ==========================================================================
   NAVEGAÇÃO ENTRE AS ABAS
   ========================================================================== */
function switchTab(tabName) {
    playSomClique();
    document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active-tab'));
    
    const selectedTabBtn = document.getElementById(`tab-${tabName}`);
    if(selectedTabBtn) selectedTabBtn.classList.add('active-tab');
    
    const novaPagina = document.getElementById(`page-${tabName}`);
    if(novaPagina) novaPagina.classList.add('active-page');

    if(tabName === 'simulador') { setTimeout(() => { map.invalidateSize(); }, 200); }
    if(tabName !== 'jogo' && jogoAtivo) { finalJogo(); }
}

/* ==========================================================================
   GESTÃO DO RANKING DE PLAYERS
   ========================================================================== */
const baseLeaderboard = [
    {nome: "Rick_Agro", pontos: 2450}, {nome: "Rodrigo M.", pontos: 1520},
    {nome: "Mariana L.", pontos: 1210}, {nome: "Carlos S.", pontos: 950},
    {nome: "Pedro_Trk", pontos: 610}
];

if (!localStorage.getItem('localLeaderboard')) {
    localStorage.setItem('localLeaderboard', JSON.stringify(baseLeaderboard));
}

function renderizarPlacarRanking(listaCompleta) {
    listaCompleta.sort((a, b) => b.pontos - a.pontos);
    const listaUI = document.getElementById('ranking-list-ui');
    listaUI.innerHTML = '';
    listaCompleta.slice(0, 7).forEach((item, index) => {
        listaUI.innerHTML += `
            <li class="ranking-item">
                <span><b>${index + 1}.</b> ${item.nome}</span>
                <span>${item.pontos} pts</span>
            </li>`;
    });
}

function carregarDadosRanking() {
    if (useFirebase) {
        database.ref('ranking').on('value', (snapshot) => {
            let dados = snapshot.val(); let lista = [];
            if (dados) { Object.keys(dados).forEach(key => lista.push(dados[key])); } 
            else { lista = [...baseLeaderboard]; }
            renderizarPlacarRanking(lista);
        });
    } else {
        renderizarPlacarRanking(JSON.parse(localStorage.getItem('localLeaderboard')));
    }
}
carregarDadosRanking();

function guardarNovaPontuacao(nome, pts) {
    if (useFirebase) {
        database.ref('ranking').push({ nome: nome, pontos: parseInt(pts) });
    } else {
        let lista = JSON.parse(localStorage.getItem('localLeaderboard'));
        lista.push({nome: nome, pontos: parseInt(pts)});
        localStorage.setItem('localLeaderboard', JSON.stringify(lista));
        carregarDadosRanking();
    }
}

/* ==========================================================================
   MOTOR DO MAPA INTERATIVO (LEAFLET)
   ========================================================================== */
const map = L.map('map', {zoomControl: true, attributionControl: false}).setView([-15.7801, -47.9292], 4); 
let camadaMapaAtual = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png').addTo(map);
let modoMapaEscuro = true;

function alternarTemaMapa() {
    playSomClique();
    map.removeLayer(camadaMapaAtual);
    if (modoMapaEscuro) {
        camadaMapaAtual = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        document.getElementById('btn-tema-mapa').innerText = "🎨 Mudar para Mapa Escuro";
        modoMapaEscuro = false;
    } else {
        camadaMapaAtual = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png').addTo(map);
        document.getElementById('btn-tema-mapa').innerText = "🎨 Mudar para Mapa Claro";
        modoMapaEscuro = true;
    }
}

let ponto1 = null, ponto2 = null, marcador1 = null, marcador2 = null, linhaRota = null;
map.on('click', function(e) {
    const lat = e.latlng.lat; const lng = e.latlng.lng;
    if (lat > 32.0 || lat < -56.0 || lng > -34.0 || lng < -118.0) {
        const alerta = document.getElementById('map-alert');
        alerta.style.display = 'block'; setTimeout(() => { alerta.style.display = 'none'; }, 2500);
        return;
    }
    playSomClique();
    if (!ponto1) {
        ponto1 = e.latlng; marcador1 = L.marker(ponto1).addTo(map);
        document.getElementById('txt-ponto1').innerText = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    } else if (!ponto2) {
        ponto2 = e.latlng; marcador2 = L.marker(ponto2).addTo(map);
        document.getElementById('txt-ponto2').innerText = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        const btn = document.getElementById('btn-calcular');
        btn.disabled = false; btn.style.backgroundColor = 'var(--primary-emerald)'; btn.style.color = '#000';
        document.getElementById('btn-limpar').style.display = 'block';
    }
});

function calcularRota() {
    if (!ponto1 || !ponto2) return;
    playSomClique();
    const dist = (map.distance(ponto1, ponto2) / 1000).toFixed(0);
    if (linhaRota) map.removeLayer(linhaRota);
    linhaRota = L.polyline([ponto1, ponto2], {color: '#10b981', weight: 4}).addTo(map);
    let perda = Math.min(45, Math.max(5, (dist * 0.02).toFixed(1)));
    document.getElementById('res-distancia').innerText = dist;
    document.getElementById('res-porcentagem').innerText = perda;
    document.getElementById('resultado').style.display = 'block';
}

function limparMapa() {
    playSomClique();
    if (marcador1) map.removeLayer(marcador1); if (marcador2) map.removeLayer(marcador2); if (linhaRota) map.removeLayer(linhaRota);
    ponto1 = null; ponto2 = null;
    document.getElementById('txt-ponto1').innerText = "Aguardando clique...";
    document.getElementById('txt-ponto2').innerText = "Aguardando clique...";
    document.getElementById('btn-calcular').disabled = true;
    document.getElementById('btn-calcular').style.background = '#273549';
    document.getElementById('btn-limpar').style.display = 'none';
    document.getElementById('resultado').style.display = 'none';
}

/* ==========================================================================
   ENGINE DO ARCADE JOGO DO CAMINHÃO
   ========================================================================== */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let jogoAtivo = false, estadoJanela = "inicio", dificuldadeAtual = "medio";
let caminhao, obstaculos, score, carga, frameCount;

const configDificuldade = {
    facil: { velCaminhao: 8, velObstaculo: 2.5, spawn: 75, chanceBuraco: 0.5 },
    medio: { velCaminhao: 6.5, velObstaculo: 4.2, spawn: 55, chanceBuraco: 0.7 },
    dificil: { velCaminhao: 5, velObstaculo: 5.8, spawn: 40, chanceBuraco: 0.85 }
};

function mudarDificuldade(tipo) {
    playSomClique();
    dificuldadeAtual = tipo;
    document.querySelectorAll('.btn-diff').forEach(btn => btn.classList.remove('active-diff'));
    document.querySelector(`.btn-diff[data-diff="${tipo}"]`).classList.add('active-diff');
}

let teclas = { ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', e => { if(e.key in teclas) teclas[e.key] = true; });
window.addEventListener('keyup', e => { if(e.key in teclas) teclas[e.key] = false; });

function gerenciarBotaoJogo() {
    playSomClique();
    if (estadoJanela === "inicio") {
        document.getElementById('gameOverScreen').style.display = 'none';
        jogoAtivo = true; estadoJanela = "jogando";
        score = 0; carga = 100; frameCount = 0; obstaculos = [];
        let cfg = configDificuldade[dificuldadeAtual];
        caminhao = { x: canvas.width / 2 - 22, y: canvas.height - 90, w: 44, h: 75, vel: cfg.velCaminhao };
        loopJogo();
    } else if (estadoJanela === "gameover") {
        const nick = document.getElementById('nomeJogador').value.trim();
        if(!nick) { alert("Diga-nos seu nome para salvar!"); return; }
        guardarNovaPontuacao(nick, score);
        document.getElementById('cadastro-score').style.display = 'none';
        document.getElementById('statsFinaisContainer').style.display = 'none';
        document.getElementById('diffContainer').style.display = 'flex';
        estadoJanela = "inicio";
        document.getElementById('gameStatusTitle').innerText = "Pronto para a Viagem?";
        document.getElementById('btn-game-action').innerText = "Ligar o Motor 🚛";
    }
}

function loopJogo() {
    if (!jogoAtivo) return;
    
    if (teclas.ArrowLeft && caminhao.x > 160) caminhao.x -= caminhao.vel;
    if (teclas.ArrowRight && caminhao.x < canvas.width - 160 - caminhao.w) caminhao.x += caminhao.vel;

    score++;
    document.getElementById('hud-distancia').innerText = `${score} pts`;

    let cfg = configDificuldade[dificuldadeAtual];
    if (frameCount % cfg.spawn === 0) {
        let pX = 160 + Math.random() * (canvas.width - 320 - 40);
        let tipo = Math.random() < cfg.chanceBuraco ? "buraco" : "bonus";
        obstaculos.push({ x: pX, y: -40, w: 38, h: 38, vel: cfg.velObstaculo + (score/1000), tipo: tipo });
    }

    for (let i = obstaculos.length - 1; i >= 0; i--) {
        obstaculos[i].y += obstaculos[i].vel;
        
        if (obstaculos[i].x < caminhao.x + caminhao.w && obstaculos[i].x + obstaculos[i].w > caminhao.x &&
            obstaculos[i].y < caminhao.y + caminhao.h && obstaculos[i].y + obstaculos[i].h > caminhao.y) {
            
            if (obstaculos[i].tipo === "buraco") {
                playSomBatida();
                carga -= 20;
            } else {
                playSomColeta();
                carga = Math.min(100, carga + 15);
            }
            document.getElementById('hud-carga').innerText = `${carga}%`;
            obstaculos.splice(i, 1);
            if (carga <= 0) finalJogo();
            continue;
        }
        if (obstaculos[i].y > canvas.height) obstaculos.splice(i, 1);
    }

    ctx.fillStyle = "#050811"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0c1324"; ctx.fillRect(150, 0, canvas.width - 300, canvas.height);
    ctx.fillStyle = "var(--primary-emerald)"; ctx.fillRect(150, 0, 4, canvas.height); ctx.fillRect(canvas.width - 154, 0, 4, canvas.height);

    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.setLineDash([20, 20]); ctx.lineDashOffset = -frameCount * 6;
    ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke(); ctx.setLineDash([]);

    obstaculos.forEach(obs => {
        if(obs.tipo === "buraco") {
            ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(obs.x + 19, obs.y + 19, 16, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "var(--accent-amber)"; ctx.lineWidth = 2; ctx.stroke();
        } else {
            ctx.fillStyle = "var(--primary-emerald)"; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        }
    });

    ctx.fillStyle = "#e2e8f0"; ctx.fillRect(caminhao.x, caminhao.y, caminhao.w, caminhao.h - 20);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(caminhao.x + 2, caminhao.y - 20, caminhao.w - 4, 20);

    frameCount++;
    requestAnimationFrame(loopJogo);
}

function finalJogo() {
    jogoAtivo = false; estadoJanela = "gameover";
    playSomBatida();
    document.getElementById('gameOverScreen').classList.add('ended');
    
    let totalDesperdiçado = Math.min(100, Math.max(10, (score * 0.05).toFixed(0)));
    document.getElementById('statDistancia').innerText = `${score} pts`;
    document.getElementById('statEficiencia').innerText = `${100 - totalDesperdiçado}%`;
    document.getElementById('statDesperdicio').innerText = `${totalDesperdiçado}%`;

    document.getElementById('gameStatusTitle').innerText = "Carga Danificada!";
    document.getElementById('resEstrelas').innerText = score > 1200 ? "⭐⭐⭐" : "⭐";
    
    document.getElementById('diffContainer').style.display = 'none';
    document.getElementById('statsFinaisContainer').style.display = 'block';
    document.getElementById('cadastro-score').style.display = 'block';
    document.getElementById('btn-game-action').innerText = "Gravar no Ranking Global 🏆";
    document.getElementById('gameOverScreen').style.display = 'flex';
}

/* ==========================================================================
   ACESSibilidade LOGIC
   ========================================================================== */
let tamanhoFonteAtual = 100;

function toggleMenuAcessibilidade() {
    const menu = document.getElementById('accessibility-menu');
    menu.classList.toggle('active');
}

function mudarTamanhoTexto(direcao) {
    tamanhoFonteAtual += (direcao * 10);
    if (tamanhoFonteAtual > 150) tamanhoFonteAtual = 150;
    if (tamanhoFonteAtual < 80) tamanhoFonteAtual = 80;
    document.body.style.fontSize = `${tamanhoFonteAtual}%`;
}

function toggleAltoContraste() {
    document.body.classList.toggle('alto-contraste');
}

document.querySelector('.btn-accessibility')
    .addEventListener('click', toggleMenuAcessibilidade);
