// Configurações dos Níveis
const LEVELS = {
    beginner: { width: 9, height: 9, minesCount: 10, label: "Iniciante (9x9, 10 minas)" },
    intermediate: { width: 16, height: 16, minesCount: 40, label: "Intermediário (16x16, 40 minas)" },
    expert: { width: 30, height: 16, minesCount: 99, label: "Expert (30x16, 99 minas)" }
};
let currentLevel = LEVELS.beginner;
let width = currentLevel.width;
let height = currentLevel.height;
let minesCount = currentLevel.minesCount;
const board = document.getElementById("board");
const resetBtn = document.getElementById("reset-btn");
const minesCounter = document.getElementById("mines-counter");
const timerDisplay = document.getElementById("timer");
const levelSelect = document.getElementById("level-select");
let grid = [];
let gameOver = false;
let timer = null;
let seconds = 0;
// Função atualizada para inicializar o seletor de nível
function initLevelSelect() {
    // Define um ponto de quebra para celular (largura da tela)
    const IS_MOBILE = window.innerWidth < 600; // Define como celular se for menor que 600px
    for (const key in LEVELS) {
        // LÓGICA DE FILTRAGEM: Pula o nível 'expert' se for um dispositivo móvel
        if (IS_MOBILE && key === 'expert') {
            continue; 
        }
        const option = document.createElement('option');
        option.value = key;
        option.textContent = LEVELS[key].label;
        levelSelect.appendChild(option);
    }
    // Se o Expert era o nível inicial e ele foi removido, voltamos para Iniciante.
    if (levelSelect.value === 'expert' && IS_MOBILE) {
        levelSelect.value = 'beginner';
    } else {
        levelSelect.value = 'beginner';
    }
    levelSelect.addEventListener('change', (e) => {
        setLevel(e.target.value);
        startGame();
    });
}
function setLevel(levelKey) {
    currentLevel = LEVELS[levelKey];
    width = currentLevel.width;
    height = currentLevel.height;
    minesCount = currentLevel.minesCount;
}
function startGame() {
    grid = [];
    gameOver = false;
    seconds = 0;
    // Redefine a exibição do botão e do contador de minas
    resetBtn.textContent = "🙂";
    minesCounter.textContent = String(minesCount).padStart(3, "0");
    timerDisplay.textContent = "000";
    if (timer) clearInterval(timer);
    timer = null; // Garante que o timer só comece com o primeiro clique
    board.innerHTML = "";
    // Atualiza o grid CSS para o novo tamanho do tabuleiro (responsividade)
     board.style.gridTemplateColumns = `repeat(${width}, auto)`;
     board.style.gridTemplateRows = `repeat(${height}, auto)`;
   //board.style.width = `calc(${width} * min(30px, 4.5vw) + ${width - 1}px)`; // Ajusta a largura (aproximada)
   //board.style.setProperty('--grid-width', width); 
    // criar células
    for (let y = 0; y < height; y++) {
        let row = [];
        for (let x = 0; x < width; x++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.addEventListener("click", () => revealCell(x, y));
            cell.addEventListener("contextmenu", e => {
                e.preventDefault();
                toggleFlag(x, y);
            });
            board.appendChild(cell);
            row.push({ element: cell, x, y, bomb: false, open: false, flag: false, number: 0 });
        }
        grid.push(row);
    }
    placeMines();
    calculateNumbers();
}
function startTimer() {
    if (timer) return;
    timer = setInterval(() => {
        seconds++;
        timerDisplay.textContent = String(seconds).padStart(3, "0");
        if (seconds >= 999) clearInterval(timer); // Limite de 999
    }, 1000);
}
function placeMines() {
    let placed = 0;
    while (placed < minesCount) {
        let x = Math.floor(Math.random() * width);
        let y = Math.floor(Math.random() * height);
        if (!grid[y][x].bomb) {
            grid[y][x].bomb = true;
            placed++;
        }
    }
}
function calculateNumbers() {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x].bomb) continue;
            let count = 0;
            for (let yy = -1; yy <= 1; yy++) {
                for (let xx = -1; xx <= 1; xx++) {
                    let nx = x + xx;
                    let ny = y + yy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        if (grid[ny][nx].bomb) count++;
                    }
                }
            }
            grid[y][x].number = count;
        }
    }
}
function revealCell(x, y) {
    if (gameOver) return;
    startTimer();
    const cell = grid[y][x];
    if (cell.open || cell.flag) return;
    cell.open = true;
    cell.element.classList.add("open");
    // Adiciona classe para cor do número
    if (cell.number > 0) {
        cell.element.textContent = cell.number;
        cell.element.classList.add(`n${cell.number}`);
    }
    if (cell.bomb) {
        cell.element.classList.add("bomb");
        resetBtn.textContent = "💀";
        endGame(false);
        return;
    }
    // Se a célula for vazia (number === 0), executa o floodFill
    if (cell.number === 0) {
        floodFill(x, y);
    }
    checkWin();
}
function floodFill(x, y) {
    for (let yy = -1; yy <= 1; yy++) {
        for (let xx = -1; xx <= 1; xx++) {
            let nx = x + xx;
            let ny = y + yy;
            // Pula a própria célula central e verifica limites
            if (nx === x && ny === y) continue;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const neighbor = grid[ny][nx];
                // Só revela se não estiver aberta e não for bomba
                if (!neighbor.open && !neighbor.bomb) {
                    // Se for um número, apenas revela sem fazer floodFill recursivo
                    if (neighbor.number > 0) {
                        neighbor.open = true;
                        neighbor.element.classList.add("open", `n${neighbor.number}`);
                        neighbor.element.textContent = neighbor.number;
                    } else {
                        // Se for zero, faz a chamada recursiva (revealCell executa floodFill novamente)
                        revealCell(nx, ny);
                    }
                }
            }
        }
    }
}
function toggleFlag(x, y) {
    if (gameOver) return;
    const cell = grid[y][x];
    if (cell.open) return;
    const currentFlags = countFlags();
    // Impede adicionar bandeira se o limite de minas for atingido
    if (!cell.flag && currentFlags >= minesCount) return;
    cell.flag = !cell.flag;
    cell.element.classList.toggle("flag");
    cell.element.textContent = cell.flag ? "🚩" : ""; // Adiciona o emoji da bandeira
    minesCounter.textContent = String(minesCount - countFlags()).padStart(3, "0");
}
function countFlags() {
    let f = 0;
    grid.forEach(row => row.forEach(c => { if (c.flag) f++; }));
    return f;
}
function endGame(win) {
    gameOver = true;
    clearInterval(timer);
    timer = null;
    // Revela todas as minas se perder
    if (!win) {
        grid.forEach(row => row.forEach(cell => {
            if (cell.bomb) {
                if (!cell.open) { // Não altera a bomba que o usuário clicou
                    cell.element.classList.add("bomb-unrevealed");
                    cell.element.textContent = "💣";
                }
            } else if (cell.flag && !cell.bomb) {
                // Marca bandeiras incorretas
                cell.element.classList.add("wrong-flag");
                cell.element.textContent = "❌";
            }
        }));
    } else {
        // Marca todas as minas restantes com bandeiras se vencer
        grid.forEach(row => row.forEach(cell => {
            if (cell.bomb && !cell.flag) {
                cell.element.classList.add("flag");
                cell.element.textContent = "🚩";
            }
        }));
    }
    setTimeout(() => {
        alert(win ? "Você venceu! 🎉 Tempo: " + String(seconds).padStart(3, "0") + "s" : "BOOM! Você perdeu 💥");
    }, 100);
}
function checkWin() {
    let uncovered = 0;
    grid.forEach(row => row.forEach(cell => {
        if (cell.open) uncovered++;
    }));
    if (uncovered === width * height - minesCount) {
        resetBtn.textContent = "😎";
        endGame(true);
    }
}
resetBtn.addEventListener("click", () => {
    resetBtn.textContent = "🙂";
    startGame();
});
// Inicia o seletor de nível e o jogo
initLevelSelect();
startGame();