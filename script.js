// Estado da Armadura da Clave (somente para sustenido 1º protótipo)
let keySharpsCount = 0; // quantos sustenidos na armadura (0 ou 1)

// ============================================================
// DESENHAR ÍCONES DOS BOTÕES
// (Manter esta função inalterada)
// ============================================================
function drawButtonIcons() {
    // ... (Manter o código de drawButtonIcons anterior) ...
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
// ÁUDIO, TABELAS E CONSTANTES (Ajuste de Frequência para Acidentes)
// ============================================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playFreq(freq, duration, startTime = audioCtx.currentTime) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.value = freq;
    osc.type = "triangle"; 

    osc.connect(gain);  
    gain.connect(audioCtx.destination);

    gain.gain.setValueAtTime(0.15, startTime); 
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
}

const noteY = {
    "B5": 40, "A5": 50, "G5": 60, "F5": 70, "E5": 80,
    "D5": 90, "C5": 100, "B4": 110, "A4": 120, "G4": 130,
    "F4": 140, "E4": 150, "D4": 160, "C4": 170
};

// Frequências base (em HZ)
const freqs = {
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00,
    "A4": 440.00, "B4": 493.88, "C5": 523.25, "D5": 587.33, "E5": 659.25,
    "F5": 698.46, "G5": 783.99, "A5": 880.00, "B5": 987.77
};
// Fator para sustenido (multiplica por 2^(1/12) - um semitom)
const SHARP_FACTOR = 1.059463; 
// Fator para bemol (divide por 2^(1/12) - um semitom)
const FLAT_FACTOR = 1 / SHARP_FACTOR; 

const noteDurations = {
    "semibreve": 2.0,
    "minima": 1.0,
    "seminima": 0.5,
    "colcheia": 0.25
};

// ============================================================
// ESTRUTURA GLOBAL E CONSTANTES DA PAUTA
// ============================================================
const canvas = document.getElementById("score");
const ctx = canvas.getContext("2d");

// NOVA ESTRUTURA: Array de Pautas, cada uma contendo Array de Acordes
let staffs = [[]]; // Inicia com uma pauta vazia

let currentStaffIndex = 0; // Para saber onde a nota será adicionada

let selectedType = "semibreve";
let useDot = false;
let selectedAccidental = null; // NOVO: null, 'sharp' ou 'flat'
let isHarmonyMode = false; 

const SPACING = 50; 
const MIN_SCORE_WIDTH = 900; 
const CLEF_MARGIN = 160; 
const STAFF_HEIGHT = 200; // Altura de cada pauta (do topo da 1ª linha ao final da 5ª)
const STAFF_OFFSET = 250; // Espaço vertical total para cada staff (inclui margem)

const clefImg = new Image();
clefImg.src = 'data:image/png;base64,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';

// ============================================================
// DESENHO DAS FIGURAS MUSICAIS E ACIDENTES
// ============================================================
function drawAccidental(accidental, x, y) {
    // Desenha o Sustenido (#) ou Bemol (♭)
    ctx.font = "30px Arial";
    ctx.fillStyle = "#333";
    // Ajusta o posicionamento do texto para a esquerda da cabeça da nota
    const symbol = accidental === 'sharp' ? '♯' : '♭';
    ctx.fillText(symbol, x - 25, y + 10);
}

// ... (drawDot, drawSemibreve, drawMinima, drawSeminima, drawColcheia, drawNote mantidos)

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
// DESENHAR PAUTA E REDRAW (Suporte a Múltiplas Pautas)
// ============================================================
function drawStaff(staffIndex) {
    const yOffset = staffIndex * STAFF_OFFSET;
    
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;




// Desenha a armadura da clave (somente 1º sustenido protótipo)
drawKeySharps(staffIndex * STAFF_OFFSET);



    
    // Linhas da pauta
    for (let i = 0; i < 5; i++) {
        const y = 80 + i * 20 + yOffset;
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(canvas.width - 20, y);
        ctx.stroke();
    }

    // --- Clave de Sol usando Unicode ---
    ctx.font = "80px Arial, sans-serif"; // tamanho ajustável
    ctx.fillStyle = "#333";
    ctx.textBaseline = "top"; // importante para posicionar verticalmente
    ctx.fillText("𝄞", 35, 75 + yOffset);

    // Letra C para compasso
    ctx.font = "bold 40px Georgia, serif";
    ctx.fillStyle = "#333";
    ctx.fillText("C", 110, 100 + yOffset);
    
    // Linha vertical inicial (barra de compasso)
    ctx.beginPath();
    ctx.moveTo(20, 80 + yOffset);
    ctx.lineTo(20, 160 + yOffset);
    ctx.stroke();

    // Linha vertical final
    ctx.beginPath();
    ctx.moveTo(canvas.width - 20, 80 + yOffset);
    ctx.lineTo(canvas.width - 20, 160 + yOffset);
    ctx.stroke();
}






function drawKeySharps(yOffset = 0) {
    if (keySharpsCount >= 1) {
        // O 1º sustenido é sempre F#
        // Linha ou espaço correspondente à nota F4 na clave de Sol
        const x = 70; // Posição X depois da clave
        const y = 100 //noteY["F4"] + yOffset; // Posição Y da nota F4
        
        ctx.font = "30px Arial";
        ctx.fillStyle = "#333";
        ctx.fillText("♯", x, y);
    }
}








function redraw() {
    // 1. Calcular a Largura Máxima
    let maxChordCount = 0;
    for (const staff of staffs) {
        if (staff.length > maxChordCount) {
            maxChordCount = staff.length;
        }
    }
    let requiredWidth = CLEF_MARGIN + (maxChordCount * SPACING) + SPACING + 20;
    canvas.width = Math.max(MIN_SCORE_WIDTH, requiredWidth); 

    // 2. Calcular a Altura Total
    const requiredHeight = staffs.length * STAFF_OFFSET;
    canvas.height = requiredHeight;

    // 3. Desenhar Todas as Pautas e Acordes
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    staffs.forEach((staff, staffIndex) => {
        drawStaff(staffIndex);
        
        const yOffset = staffIndex * STAFF_OFFSET;
        let x = CLEF_MARGIN;
        
        for (const chord of staff) {
            // Desenha todas as notas do acorde na mesma posição X
            for (const note of chord) {
                const noteYPos = noteY[note.pitch] + yOffset;
                
                // Desenha o acidente, se houver
                if (note.accidental) {
                    drawAccidental(note.accidental, x, noteYPos);
                }
                
                // Desenha a nota
                drawNote(note.type, x, noteYPos, note.dot);
            }
            x += SPACING;
        }
    });
}

// Aguardar imagem carregar antes de desenhar
clefImg.onload = function() {
    redraw();
};
redraw(); // Chamada inicial

// ============================================================
// INTERAÇÃO COM CANVAS
// ============================================================
canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;

    // 1. Determina em qual pauta o clique ocorreu
    let targetStaffIndex = Math.floor(clickY / STAFF_OFFSET);
    if (targetStaffIndex >= staffs.length) {
        targetStaffIndex = staffs.length - 1; // Garante que não ultrapasse
    }
    currentStaffIndex = targetStaffIndex;

    const staffYOffset = targetStaffIndex * STAFF_OFFSET;
    const relativeY = clickY - staffYOffset; // Y relativo à pauta

    let bestPitch = null;
    let bestDist = Infinity;

    // 2. Encontra a nota mais próxima
    for (const p in noteY) {
        const d = Math.abs(noteY[p] - relativeY);
        if (d < bestDist) {
            bestDist = d;
            bestPitch = p;
        }
    }
    
    if (bestDist > 15) return; 

    // 3. Cria a nova nota com o acidente selecionado
    const newNote = { 
        pitch: bestPitch, 
        type: selectedType, 
        dot: useDot, 
        accidental: selectedAccidental // Inclui o acidente
    };
    
    const targetStaff = staffs[currentStaffIndex];

    if (isHarmonyMode && targetStaff.length > 0) {
        // MODO HARMONIA: Adiciona a nota ao último acorde da pauta
        const lastChord = targetStaff[targetStaff.length - 1];
        
        // Verifica se a nota já existe (pitch + accidental)
        const isPitchPresent = lastChord.some(note => 
            note.pitch === bestPitch && note.accidental === selectedAccidental
        );
        if (!isPitchPresent) {
             lastChord.push(newNote);
        }
       
    } else {
        // MODO NORMAL: Inicia um novo acorde
        targetStaff.push([newNote]);
    }

    // Deseleciona o acidente após o uso
    selectedAccidental = null;
    document.querySelectorAll(".accidental").forEach(b => b.classList.remove("selected"));

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

// Seleção de Acidente
document.querySelectorAll(".accidental").forEach(btn => {
    btn.addEventListener("click", () => {
        const accidentalType = btn.dataset.accidental;

        if (selectedAccidental === accidentalType) {
            // Desativa se já estiver selecionado
            selectedAccidental = null;
            btn.classList.remove("selected");
        } else {
            // Seleciona um novo
            document.querySelectorAll(".accidental").forEach(b => b.classList.remove("selected"));
            selectedAccidental = accidentalType;
            btn.classList.add("selected");
        }
    });
});

document.querySelector(".fig[data-type='semibreve'][data-dot='false']").classList.add("selected");

// Tocar (Lógica adaptada para Acidentes e Múltiplas Pautas)
document.getElementById("play").addEventListener("click", async () => {
    // Constrói uma fila de todos os acordes de todas as pautas em ordem
    const allChords = staffs.flat(); 
    
    if (allChords.length === 0) {
        alert("Adicione notas na partitura primeiro!");
        return;
    }

    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    let t = audioCtx.currentTime;
    
    for (const chord of allChords) {
        if (chord.length === 0) continue; 
        
        const baseNote = chord[0];
        let duration = noteDurations[baseNote.type] || 0.5;
        if (baseNote.dot) duration *= 1.5; 
        
        // Toca todas as notas do acorde simultaneamente
        for(const note of chord) {
            let freq = freqs[note.pitch];
            
            // Aplica o acidente para ajustar a frequência
            if (note.accidental === 'sharp') {
                freq *= SHARP_FACTOR;
            } else if (note.accidental === 'flat') {
                freq *= FLAT_FACTOR;
            }
            
            playFreq(freq, duration, t);
        }

        t += duration;
    }
});

// Limpar (Limpa todas as pautas)
document.getElementById("clear").addEventListener("click", () => {
    const allChords = staffs.flat(); 
    if (allChords.length > 0 && confirm("Deseja limpar toda a partitura?")) {
        staffs = [[]]; // Reinicia com uma única pauta vazia
        currentStaffIndex = 0;
        redraw();
    }
});

// Desfazer (Remove o último acorde/nota da pauta atual)
document.getElementById("undo").addEventListener("click", () => {
    const targetStaff = staffs[currentStaffIndex];

    if (targetStaff.length > 0) {
        const lastChord = targetStaff[targetStaff.length - 1];
        
        if (lastChord.length > 1) {
            // Se for um acorde, remove apenas a última nota adicionada
            lastChord.pop();
        } else {
            // Se for uma nota única, remove o acorde/nota inteiro
            targetStaff.pop();
        }
        redraw();
    }
});

// Adicionar Pauta (Funcional!)
document.getElementById("add-staff").addEventListener("click", () => {
    staffs.push([]); // Adiciona uma nova pauta vazia
    currentStaffIndex = staffs.length - 1; // Define a nova pauta como ativa
    redraw();
    
    // Rola a página para baixo para ver a nova pauta
    const wrapper = document.querySelector('.score-wrapper');
    wrapper.scrollTop = wrapper.scrollHeight;
});




// Adicionar 1º sustenido
document.getElementById("key-sharp-up").addEventListener("click", () => {
    keySharpsCount = 1; // Protótipo: só 1 sustenido
    redraw();
});

// Remover sustenido
document.getElementById("key-sharp-down").addEventListener("click", () => {
    keySharpsCount = 0;
    redraw();
});


