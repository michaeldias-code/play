// View.js — v1
export class View {
    constructor(board, controller) {
        this.board = board;
        this.controller = controller;
        this.selected = null;
        this.lastMove = null;
        this.validMoves = []; // <<<< NOVO: Lista de índices dos movimentos válidos
        // Espera que exista <div id="chess-container"></div> no HTML
        this.container = document.getElementById("chess-container");
        if (!this.container) {
            // fallback: cria se não existir (não recomendado em produção)
            this.container = document.createElement("div");
            this.container.id = "chess-container";
            document.body.appendChild(this.container);
        }
        /* áreas */
        this.rankArea = document.createElement("div");
        this.rankArea.id = "rank-area";
        this.container.appendChild(this.rankArea);
        this.fileArea = document.createElement("div");
        this.fileArea.id = "file-area";
        this.container.appendChild(this.fileArea);
        /* tabuleiro */
        this.boardDiv = document.createElement("div");
        this.boardDiv.id = "chessboard";
        this.container.appendChild(this.boardDiv);
        /* <<<<<<<<<<<<<< IMPORTANTE >>>>>>>>>>>>>> */
        this.createRankLabels();
        this.createFileLabels();
        this.render();
        this.addClickHandlers();
    }
    setupRestartButton(callback) {
        // ... código mantido ...
        const btn = document.getElementById("restart-btn");
        if (!btn) return;
        btn.replaceWith(btn.cloneNode(true));
        const fresh = document.getElementById("restart-btn");
        fresh.addEventListener("click", callback);
    }
    /* ---------------- Notações ---------------- */
    createFileLabels() {
        // ... código mantido ...
        const files = "abcdefgh";
        this.fileArea.innerHTML = "";
        for (let c = 0; c < 8; c++) {
            const lbl = document.createElement("div");
            lbl.textContent = files[c];
            this.fileArea.appendChild(lbl);
        }
    }
    createRankLabels() {
        // ... código mantido ...
        this.rankArea.innerHTML = "";
        for (let r = 0; r < 8; r++) {
            const lbl = document.createElement("div");
            lbl.textContent = 8 - r;
            this.rankArea.appendChild(lbl);
        }
    }
    /* ---------------- Destaque de Movimentos Válidos (NOVO) ---------------- */
    highlightValidMoves(moves) {
        // Limpa destaques anteriores primeiro
		console.log("Linha 65 - HIGHLIGHT");
        this.clearHighlights();
        this.validMoves = moves;
        // Adiciona a classe 'valid-move' às células de destino
        moves.forEach(index => {
            const cell = this.boardDiv.querySelector(`.cell[data-index="${index}"]`);
            if (cell) {
                cell.classList.add("valid-move");
                // Adiciona um ponto visual
                if (!this.board.board[index]) {
					console.log("Linha 75 - HIGHLIGHT");
                    const dot = document.createElement("div");
                    dot.className = "valid-dot";
                    cell.appendChild(dot);
                }
            }
        });
    }
    clearHighlights() {
        // Remove todos os destaques de movimentos válidos
        this.boardDiv.querySelectorAll('.valid-move').forEach(cell => {
            cell.classList.remove('valid-move');
        });
        // Remove todos os pontos visuais
        this.boardDiv.querySelectorAll('.valid-dot').forEach(dot => {
            dot.remove();
        });
        this.validMoves = [];
    }
    /* ---------------- Renderização ---------------- */
    render() {
        // Rerenderizar o tabuleiro completo
        this.boardDiv.innerHTML = "";
        for (let r = 0; r < 8; r++) {		
            for (let c = 0; c < 8; c++) {
                const i = r * 8 + c;
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.classList.add((r + c) % 2 === 0 ? "white" : "black");
                cell.dataset.index = i;
                // Seleção
                if (this.selected === i) cell.classList.add("selected");
                // Destaque último movimento
                if (this.lastMove && (i === this.lastMove.from || i === this.lastMove.to)) {
                    cell.classList.add("ai-move");
                }
                // Destaque de movimento válido (mantido no render, embora seja melhor aplicar fora)
                // Usaremos clearHighlights/highlightValidMoves para melhor desempenho, mas a lógica de seleção segue abaixo:
                // Renderizar peça
                const piece = this.board.board[i];
                if (piece) {
                    const span = document.createElement("span");
                    span.textContent = piece.tipo;
                    span.className = `piece ${piece.cor}`;
                    cell.appendChild(span);
                }
                this.boardDiv.appendChild(cell);
            }
        }
        // Re-aplica os destaques de movimentos válidos após o re-render
        if (this.selected !== null && this.validMoves.length > 0) {
			console.log("Linha 126 - HIGHLIGHT");
            this.highlightValidMoves(this.validMoves);
        }
    }
    /* ---------------- Destaque de movimento AI/último movimento ---------------- */
    highlightCell(index) {
        // ... código mantido ...
		console.log("Linha 133 - HIGHLIGHT");
        const prev = this.boardDiv.querySelector(".ai-move");
        if (prev) prev.classList.remove("ai-move");
        const cell = this.boardDiv.querySelector(`.cell[data-index="${index}"]`);
        if (cell) cell.classList.add("ai-move");
        setTimeout(() => {
            if (cell) cell.classList.remove("ai-move");
        }, 500);
    }
    /* ---------------- Eventos de clique (MODIFICADO) ---------------- */
    addClickHandlers() {
        this.boardDiv.addEventListener("click", e => {
            const cell = e.target.closest(".cell");
            if (!cell) return;
            const index = Number(cell.dataset.index);
            console.log(`DEBUG click em célula, alvo DOM:`, cell, 'dataset.index=', cell && cell.dataset && cell.dataset.index);
            const piece = this.board.board[index];
            if (this.selected === null) {
                // Seleção inicial: só permite selecionar peças brancas (jogador)
                if (piece && piece.cor === "brancas" && this.controller.currentTurn === "brancas") {
                    this.selected = index;
                    // <<<< NOVO CHECK: Aplica o auxílio visual APENAS no modo 'easy' >>>>
                    if (this.controller.difficulty === "easy") {
						console.log("Linha 156 - HIGHLIGHT");
                        this.validMoves = this.controller.getValidMoves(index);
                        this.highlightValidMoves(this.validMoves);
                    }
                }
            } else {
                if (this.selected === index) {
                    // Deseleciona
                    this.selected = null;
                    this.clearHighlights(); 
                } else {
                    // Tentativa de movimento
                    console.log(`DEBUG tentativa de movimento: from=${this.selected} (${this.board.board[this.selected]?.tipo}), to=${index} (${this.board.board[index] ? this.board.board[index].tipo : 'vazio'})`);
                    const ok = this.controller.movePiece(this.selected, index);
                    if (ok) this.lastMove = { from: this.selected, to: index };
                    this.selected = null;
                    this.clearHighlights(); 
                }
            }
            this.render();
        });
    }
    // ---------------- Game Over Modal (mantive seu estilo) ----------------
    onGameOver({ winner, reason }) {
        const modal = document.createElement("div");
        modal.className = "game-over-modal";  // Estilo de modal
        const modalContent = document.createElement("div");
        modalContent.className = "game-over-content";
        // Personaliza a mensagem com base no vencedor
        if (winner === "brancas") {
            modalContent.innerHTML = `
                <h2>Parabéns, você venceu!!!</h2>
                <p>Quer jogar novamente?</p>
            `;
        } else {
            modalContent.innerHTML = `
                <h2>Você perdeu!</h2>
                <p>Quer tentar novamente?</p>
            `;
        }
        // Botões de ação
        const replayButton = document.createElement("button");
        replayButton.textContent = "Sim";
        replayButton.className = "replay-button";
        replayButton.onclick = () => {
            this.controller.resetGame();
            this.closeModal(modal);
        };
        const noButton = document.createElement("button");
        noButton.textContent = "Não";
        noButton.className = "no-button";
        noButton.onclick = () => this.closeModal(modal);
        modalContent.appendChild(replayButton);
        modalContent.appendChild(noButton);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        modal.style.display = "flex";
    }
    /* ---------------- Fechar o Modal ---------------- */
    closeModal(modal) {
        if (!modal) return;
        // simplesmente esconde e remove
        modal.style.display = "none";
        if (modal.parentNode) modal.parentNode.removeChild(modal);
    }
    /* ---------------- Modal de Promoção (chamado pelo GameController) ----------------
       showPromotionModal(cor, callback) - ex: cor = "brancas" ou "pretas"
       callback(tipoEscolhido) => retorna o símbolo escolhido (♕, ♖, ♗, ♘ ou versões pretas)
    ------------------------------------------------------------------------------ */
	showPromotionModal(cor, callback) {
		// Criar overlay
		const modal = document.createElement("div");
		modal.className = "promotion-overlay";
		modal.style.position = "fixed";
		modal.style.top = "0";
		modal.style.left = "0";
		modal.style.right = "0";
		modal.style.bottom = "0";
		modal.style.display = "flex";
		modal.style.alignItems = "center";
		modal.style.justifyContent = "center";
		modal.style.background = "rgba(0,0,0,0.6)";
		modal.style.zIndex = "9999";
		// Box
		const box = document.createElement("div");
		box.className = "promotion-box";
		box.style.background = "#fff";
		box.style.padding = "18px";
		box.style.borderRadius = "10px";
		box.style.textAlign = "center";
		box.style.boxShadow = "0 6px 20px rgba(0,0,0,0.25)";
		const h = document.createElement("h3");
		h.textContent = "Promoção de Peão";
		box.appendChild(h);
		const p = document.createElement("p");
		p.textContent = "Escolha a peça para promover:";
		box.appendChild(p);
		const options = document.createElement("div");
		options.style.display = "flex";
		options.style.gap = "14px";
		options.style.justifyContent = "center";
		options.style.marginTop = "12px";
		const pieces = cor === "brancas"
			? ["♕", "♖", "♗", "♘"]
			: ["♛", "♜", "♝", "♞"];
		pieces.forEach(symbol => {
			const btn = document.createElement("button");
			btn.className = "promo-piece";
			btn.textContent = symbol;
			btn.style.fontSize = "32px";
			btn.style.padding = "8px 12px";
			btn.style.borderRadius = "8px";
			btn.style.cursor = "pointer";
			btn.style.border = "2px solid rgba(0,0,0,0.12)";
			btn.onclick = () => {
				this.closeModal(modal);
				callback(symbol);   // <<<<<<🔥🔥 CHAMA O CALLBACK CERTO!!!
			};
			options.appendChild(btn);
		});
		box.appendChild(options);
		modal.appendChild(box);
		document.body.appendChild(modal);
	}
    hidePromotionModal() {
        const modal = document.querySelector(".promotion-overlay");
        if (modal) modal.remove();
    }
    /* ---------------- Resetar o Jogo (View apenas delega para o Controller) ---------------- */
    resetGame() {
        // apenas delega para o controller — o controller é o dono do estado
        if (this.controller && typeof this.controller.resetGame === "function") {
            this.controller.resetGame();
        }
    }
    /* ---------------- Fechar a mensagem de fim de jogo ---------------- */
    closeMessage() {
        const gameOverMessage = document.querySelector(".game-over-message");
        if (gameOverMessage) {
            gameOverMessage.remove();
        }
    }
}
