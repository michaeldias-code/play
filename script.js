// ============================================================
// DESENHAR ÍCONES DOS BOTÕES
// ============================================================
function drawButtonIcons() {
    const drawHead = (ctx, x, y, fill = false, scale = 1) => {
        ctx.beginPath();
        ctx.ellipse(x, y, 10 * scale, 7 * scale, -0.3, 0, Math.PI * 2);
        ctx.lineWidth = 2.5 * scale;
        if (fill) {
            ctx.fillStyle = '#333';
            ctx.fill();
        } else {
            ctx.stroke();
        }
    };
    
    const drawStem = (ctx, x, y, scale = 1) => {
        ctx.beginPath();
        ctx.moveTo(x + 10 * scale, y);
        ctx.lineTo(x + 10 * scale, y - 25 * scale);
        ctx.lineWidth = 2.5 * scale;
        ctx.stroke();
    };

    const drawDotIcon = (ctx, x, y, scale = 1) => {
        ctx.beginPath();
        ctx.arc(x + 16 * scale, y, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();
    };
    
    const drawFlag = (ctx, x, y, scale = 1) => {
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.moveTo(x + 10 * scale, y - 25 * scale);
        ctx.quadraticCurveTo(x + 20 * scale, y - 20 * scale, x + 10 * scale, y - 12 * scale);
        ctx.stroke();
    };

    // Semibreve normal
    const semibreve = document.querySelector('[data-type="semibreve"][data-dot="false"] canvas');
    if (semibreve) {
        const ctxS = semibreve.getContext('2d');
        ctxS.translate(25, 25);
        drawHead(ctxS, 0, 0, false, 1);
    }

    // Mínima normal
    const minima = document.querySelector('[data-type="minima"][data-dot="false"] canvas');
    if (minima) {
        const ctxM = minima.getContext('2d');
        ctxM.translate(25, 30);
        drawHead(ctxM, 0, 0, false, 1);
        drawStem(ctxM, 0, 0, 1);
    }

    // Semibreve pontuada
    const semibreveDot = document.querySelector('[data-type="semibreve"][data-dot="true"] canvas');
    if (semibreveDot) {
        const ctxSD = semibreveDot.getContext('2d');
        ctxSD.translate(20, 25);
        drawHead(ctxSD, 0, 0, false, 0.85);
        drawDotIcon(ctxSD, 0, 0, 1);
    }

    // Mínima pontuada
    const minimaDot = document.querySelector('[data-type="minima"][data-dot="true"] canvas');
    if (minimaDot) {
        const ctxMD = minimaDot.getContext('2d');
        ctxMD.translate(20, 30);
        drawHead(ctxMD, 0, 0, false, 0.85);
        drawStem(ctxMD, 0, 0, 1);
        drawDotIcon(ctxMD, 0, 0, 1);
    }

    // Semínima pontuada
    const seminimaDot = document.querySelector('[data-type="seminima"][data-dot="true"] canvas');
    if (seminimaDot) {
        const ctxSED = seminimaDot.getContext('2d');
        ctxSED.translate(20, 30);
        drawHead(ctxSED, 0, 0, true, 0.85);
        drawStem(ctxSED, 0, 0, 1);
        drawDotIcon(ctxSED, 0, 0, 1);
    }

    // Colcheia pontuada
    const colcheiaDot = document.querySelector('[data-type="colcheia"][data-dot="true"] canvas');
    if (colcheiaDot) {
        const ctxCD = colcheiaDot.getContext('2d');
        ctxCD.translate(20, 32);
        drawHead(ctxCD, 0, 0, true, 0.85);
        drawStem(ctxCD, 0, 0, 1);
        drawFlag(ctxCD, 0, 0, 1);
        drawDotIcon(ctxCD, 0, 0, 1);
    }
}

drawButtonIcons();

// ============================================================
// ÁUDIO (AGORA COM ONDA TRIANGULAR E GANHO AJUSTADO)
// ============================================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playFreq(freq, duration, startTime = audioCtx.currentTime) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.value = freq;
    // MUDANÇA: Usando onda triangular para som mais suave
    osc.type = "triangle"; 

    osc.connect(gain);  
    gain.connect(audioCtx.destination);

    // MUDANÇA: Ganho reduzido para 0.15 para evitar distorção digital
    gain.gain.setValueAtTime(0.15, startTime); 
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
}

// ============================================================
// TABELAS E CONSTANTES
// ============================================================
const noteY = {
    "B5": 40, "A5": 50, "G5": 60, "F5": 70, "E5": 80,
    "D5": 90, "C5": 100, "B4": 110, "A4": 120, "G4": 130,
    "F4": 140, "E4": 150, "D4": 160, "C4": 170
};

const freqs = {
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00,
    "A4": 440.00, "B4": 493.88, "C5": 523.25, "D5": 587.33, "E5": 659.25,
    "F5": 698.46, "G5": 783.99, "A5": 880.00, "B5": 987.77
};

const noteDurations = {
    "semibreve": 2.0,
    "minima": 1.0,
    "seminima": 0.5,
    "colcheia": 0.25
};

// ============================================================
// CANVAS E PARTITURA
// ============================================================
const canvas = document.getElementById("score");
const ctx = canvas.getContext("2d");

let selectedType = "semibreve";
let useDot = false;
let isHarmonyMode = false; // ESTADO PARA HARMONIA

// ESTRUTURA REESCRITA: `notes` armazena Acordes (Array de Arrays de notas)
let notes = []; 

const SPACING = 50; 
const MIN_SCORE_WIDTH = 900; 
const CLEF_MARGIN = 160; 

const clefImg = new Image();
clefImg.src = 'data:image/png;base64,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';

// ============================================================
// DESENHO DAS FIGURAS MUSICAIS (FIXO)
// ============================================================
// As funções de desenho aqui usam valores fixos e não precisam de escala.
// ... (drawDot, drawSemibreve, drawMinima, drawSeminima, drawColcheia, drawNote)
// ... (Mantido o código do bloco anterior)
function drawDot(x, y) {
    ctx.beginPath();
    ctx.arc(x + 20, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#333";
    ctx.fill();
}

function drawSemibreve(x, y, withDot = false) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#333";
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 7, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    if (withDot) drawDot(x, y);
}

function drawMinima(x, y, withDot = false) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#333";
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 7, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 10, y - 40);
    ctx.stroke();
    if (withDot) drawDot(x, y);
}

function drawSeminima(x, y, withDot = false) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#333";
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 10, y - 40);
    ctx.stroke();
    if (withDot) drawDot(x, y);
}

function drawColcheia(x, y, withDot = false) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#333";
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 10, y - 40);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 40);
    ctx.quadraticCurveTo(x + 26, y - 33, x + 10, y - 20);
    ctx.stroke();
    if (withDot) drawDot(x, y);
}

function drawNote(type, x, y, dot = false) {
    if (type === "semibreve") drawSemibreve(x, y, dot);
    else if (type === "minima") drawMinima(x, y, dot);
    else if (type === "seminima") drawSeminima(x, y, dot);
    else if (type === "colcheia") drawColcheia(x, y, dot);
}


// ============================================================
// DESENHAR PAUTA E REDRAW (Adaptado para Scroll Horizontal)
// ============================================================
function drawStaff() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;

    // Linhas da pauta
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(20, 80 + i * 20);
        ctx.lineTo(canvas.width - 20, 80 + i * 20);
        ctx.stroke();
    }

    // Clave de sol
    if (clefImg.complete) {
        ctx.drawImage(clefImg, 35, 75, 40, 80);
    }

    // Letra C para compasso
    ctx.font = "bold 40px Georgia, serif";
    ctx.fillStyle = "#333";
    ctx.fillText("C", 110, 135);
}

function redraw() {
    const chordCount = notes.length;
    // Largura mínima de 900px, ou a largura necessária para todas as notas.
    let requiredWidth = CLEF_MARGIN + (chordCount * SPACING) + SPACING + 20;
    
    canvas.width = Math.max(MIN_SCORE_WIDTH, requiredWidth); 

    drawStaff();

    let x = CLEF_MARGIN;
    for (const chord of notes) {
        // Desenha todas as notas do acorde na mesma posição X
        for (const note of chord) {
            // Nota: O tipo e pontuação são definidos pela PRIMEIRA nota do acorde no modo "play"
            drawNote(note.type, x, noteY[note.pitch], note.dot);
        }
        x += SPACING;
    }
}

// Aguardar imagem carregar antes de desenhar
clefImg.onload = function() {
    redraw();
};
redraw(); // Chamada inicial

// ============================================================
// INTERAÇÃO COM CANVAS (Harmonia)
// ============================================================
canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    // A posição X do clique dentro do canvas (importante para Harmonia)
    const clickX = e.clientX - rect.left; 
    const y = e.clientY - rect.top;

    let bestPitch = null;
    let bestDist = Infinity;

    // Encontra a nota mais próxima
    for (const p in noteY) {
        const d = Math.abs(noteY[p] - y);
        if (d < bestDist) {
            bestDist = d;
            bestPitch = p;
        }
    }
    
    if (bestDist > 15) return; 

    const newNote = { pitch: bestPitch, type: selectedType, dot: useDot };

    if (isHarmonyMode && notes.length > 0) {
        // MODO HARMONIA: Adiciona a nota ao último acorde
        const lastChord = notes[notes.length - 1];
        
        // CORREÇÃO HARMONIA: Garante que a nota não seja repetida no mesmo acorde
        const isPitchPresent = lastChord.some(note => note.pitch === bestPitch);
        if (!isPitchPresent) {
             lastChord.push(newNote);
        }
       
    } else {
        // MODO NORMAL: Inicia um novo acorde
        notes.push([newNote]);
    }

    redraw();
});

// ============================================================
// BOTÕES DE CONTROLE
// ============================================================

// Toggle Harmonia
const harmonyBtn = document.getElementById("harmony");
if (harmonyBtn) {
    harmonyBtn.addEventListener("click", () => {
        isHarmonyMode = !isHarmonyMode;
        if (isHarmonyMode) {
            harmonyBtn.classList.add("active");
            harmonyBtn.textContent = "✅ Harmonia ATIVA";
        } else {
            harmonyBtn.classList.remove("active");
            harmonyBtn.textContent = "🎵 Harmonia";
        }
    });
}

// Seleção de Figura (desativa Harmonia)
document.querySelectorAll(".fig").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".fig").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedType = btn.dataset.type;
        useDot = btn.dataset.dot === "true";
        
        // Desativa o modo Harmonia
        isHarmonyMode = false;
        if (harmonyBtn) {
            harmonyBtn.classList.remove("active");
            harmonyBtn.textContent = "🎵 Harmonia";
        }
    });
});

document.querySelector(".fig[data-type='semibreve'][data-dot='false']").classList.add("selected");

// Tocar
document.getElementById("play").addEventListener("click", async () => {
    if (notes.length === 0) {
        alert("Adicione notas na partitura primeiro!");
        return;
    }

    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    let t = audioCtx.currentTime;
    
    for (const chord of notes) {
        // A duração é determinada pela primeira nota do acorde
        if (chord.length === 0) continue; 
        
        const baseNote = chord[0];
        let duration = noteDurations[baseNote.type] || 0.5;
        if (baseNote.dot) duration *= 1.5; 
        
        // Toca todas as notas do acorde simultaneamente
        for(const note of chord) {
            // Garantir que a duração seja aplicada a todas as notas do acorde
            playFreq(freqs[note.pitch], duration, t);
        }

        t += duration;
    }
});

// Limpar
document.getElementById("clear").addEventListener("click", () => {
    if (notes.length > 0 && confirm("Deseja limpar toda a partitura?")) {
        notes = [];
        redraw();
    }
});

// Desfazer
document.getElementById("undo").addEventListener("click", () => {
    if (notes.length > 0) {
        const lastChord = notes[notes.length - 1];
        
        if (lastChord.length > 1) {
            // Se for um acorde, remove apenas a última nota adicionada
            lastChord.pop();
        } else {
            // Se for uma nota única, remove o acorde/nota inteiro
            notes.pop();
        }
        redraw();
    }
});

// Adicionar Pauta (Lógica de placeholder por enquanto)
document.getElementById("add-staff").addEventListener("click", () => {
    alert("Funcionalidade 'Adicionar Pauta' requer mais refatoração e será implementada em seguida!");
});
