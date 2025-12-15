// GameController.js -v1
import { View } from './View.js?v=999';
import { AI } from './AI.js?v=999';
import { Board } from './Board.js?v=999';
import { EnPassant } from './EnPassant.js?v=999'; // <<<< CORRIGIDO AQUI: USAR { }
import { MoveValidator } from './MoveValidator.js?v=999';
export class GameController {
	constructor() {
		this.difficultySelect = document.getElementById("difficulty");
	    // dificuldade inicial
	    this.difficulty = this.difficultySelect.value;
	    // quando o usuário mudar...
	    this.difficultySelect.addEventListener("change", () => {
    	    this.difficulty = this.difficultySelect.value;
        	console.log("Dificuldade selecionada:", this.difficulty);
	        this.resetGame(); // reinicia tudo
    	});
		console.log("GameController inicializando...");
		this.board = new Board();
		//versão para test - Expor para o console
    	window.board = this.board;   // instância
    	window.Board = Board;        // classe
		// Tentar instanciar EnPassant
		try {
			if (typeof EnPassant !== 'undefined') {
				// Instanciamos o EnPassant sem passar o tabuleiro, pois ele precisa apenas do estado.
				this.enPassant = new EnPassant(); 
			} else {
				this.enPassant = null;
			}
		} catch (e) {
			this.enPassant = null;
		}
		// Passamos a instância EP para os módulos que precisam.
		this.validator = new MoveValidator(this.board.board, this.enPassant);
		this.ai = new AI(this.board, this.validator, this.enPassant, this.difficulty);
		this.moveHistory = []; // <<<< ADICIONE ESTA LINHA
		//consoleMode
		const isConsoleMode = window.location.href.includes("consolemode");
		// Adiciona classe ao body
		//INICIA ***CONSOLE MODE***
		if (isConsoleMode) {
			// Oculta o tabuleiro
			document.body.classList.add("consolemode");
			// Cria a caixinha de console web
			const consoleDiv = document.createElement('div');
			consoleDiv.style.cssText = `
				position: fixed;
				bottom: 0;
				left: 0;
				right: 0;
				height: 200px;
				background: #fff;
				border-top: 2px solid #000;
				font-family: monospace;
				padding: 8px;
				overflow-y: auto;
				display: flex;
				flex-direction: column;
				z-index: 9999;
			`;
			const outputDiv = document.createElement('div');
			outputDiv.style.flex = '1';
			outputDiv.style.overflowY = 'auto';
			const inputDiv = document.createElement('div');
			inputDiv.style.display = 'flex';
			const promptSpan = document.createElement('span');
			promptSpan.textContent = '>';
			const input = document.createElement('input');
			input.style.cssText = 'flex:1; border:none; outline:none; font-family:monospace';
			inputDiv.appendChild(promptSpan);
			inputDiv.appendChild(input);
			consoleDiv.appendChild(outputDiv);
			consoleDiv.appendChild(inputDiv);
			document.body.appendChild(consoleDiv);
			// Função para escrever no console da página
			function wlog(...args) {
				args.forEach(a => {
					const div = document.createElement('div');
					div.textContent = typeof a === 'object' ? JSON.stringify(a, null, 2) : a;
					outputDiv.appendChild(div);
				});
				outputDiv.scrollTop = outputDiv.scrollHeight;
			}
			// Redireciona todo console.log para wlog
			const originalLog = console.log;
			console.log = (...args) => {
				wlog(...args);       // escreve na caixinha web
				originalLog(...args); // opcional: mantém no DevTools
			};
			// Permite digitar comandos e ver resultados
			input.addEventListener('keydown', e => {
				if (e.key === 'Enter') {
					const cmd = input.value;
					wlog('> ' + cmd);
					try {
						const result = eval(cmd);
						if (result !== undefined) wlog(result);
					} catch(err) {
						wlog('Error: ' + err);
					}
					input.value = '';
				}
			});
			// Expor board e wlog para a página
			window.board = this.board;
			window.wlog = wlog;
		}
		//FIM ***CONSOLE MODE***
		this.view = new View(this.board, this);
		this.currentTurn = "brancas";
		this.gameOver = false;
		this.lastMove = null;
		this.aiTimerId = null;
		this.view.setupRestartButton(() => {
			this.resetGame();
		});
		// Configura o estado inicial do EP (deve ser null)
		if (this.enPassant) {
			this.enPassant.resetTarget();
		}
		console.log("GameController carregado!");
	}
	movePiece(from, to) {
		if (this.gameOver) return false;
		const piece = this.board.board[from];
		if (!piece) return false;
		if (piece.cor !== this.currentTurn) return false;
		const validMoves = this.validator.getPossibleMoves(from);
		if (!validMoves.includes(to)) return false;
		console.log(`DEBUG validator.getPossibleMoves para ${this.indexToNotation(from)} (${from}) =>`, validMoves);
		// --- SALVA A PEÇA DE DESTINO ANTES DO MOVIMENTO ---
		const capturedPiece = this.board.board[to] || null;
		// --- Verifica En Passant ---
		let epCapturedPos = null;
		let epPiece = null;
		if (this.enPassant && piece.tipo in { '♙': 1, '♟': 1 }) {
			epCapturedPos = this.enPassant.isEnPassantMove(from, to, piece);
			if (epCapturedPos !== null) epPiece = this.board.board[epCapturedPos];
		}
		// --- Executa o movimento ---
		this.board.movePiece(from, to, epCapturedPos);
		//NOVO
							this.view.render();
					this.view.highlightCell(m.to);
//fim novo
		// --- Salva no histórico de movimentos ---
		this.moveHistory.push({
			from,
			to,
			pieceType: piece.tipo,
			color: piece.cor,
			captured: epPiece ? epPiece.tipo : (capturedPiece ? capturedPiece.tipo : null)
		});
		// --- Log detalhado ---
		let logMsg = `▶️ Jogador: ${this.indexToNotation(from)} -> ${this.indexToNotation(to)}`;
		console.log(logMsg);
		// Detecta roque (Reis são ♔ e ♚)
		if (piece.tipo === "♔" || piece.tipo === "♚") {
			const row = piece.cor === "brancas" ? 7 : 0;
			// Roque curto
			if (to === row * 8 + 6) {
				console.log("? Roque curto!");
				// mover torre e marcar hasMoved
				this.board.movePiece(row * 8 + 7, row * 8 + 5); 
				if (this.board.board[row*8 + 5]) this.board.board[row*8 + 5].hasMoved = true;
				if (this.board.board[to]) this.board.board[to].hasMoved = true;
			}
			// Roque longo
			if (to === row * 8 + 2) {
				console.log("? Roque longo!");
				this.board.movePiece(row * 8 + 0, row * 8 + 3); 
				if (this.board.board[row*8 + 3]) this.board.board[row*8 + 3].hasMoved = true;
				if (this.board.board[to]) this.board.board[to].hasMoved = true;
			}
		}
		// 5. Zera o estado EP no Board para o próximo turno. 
		//    A informação EP está agora transferida para o Board (enPassantTargetPos).
		//    O Board se auto-atualiza em movePiece, mas o GameController precisa garantir 
		//    que o *próximo* MoveValidator use o estado correto.
		this.view.lastMove = { from, to };
		this.view.render();
		// ... (Lógica de Promoção de Peão mantida, com os símbolos corrigidos ♙/♟) ...
		if (piece.tipo === "♙" || piece.tipo === "♟") {
			if ((piece.cor === "brancas" && this.board.row(to) === 0) || (piece.cor === "pretas" && this.board.row(to) === 7)) {
				console.log(`? Promoção detectada! Peão chegou em ${this.indexToNotation(to)}`);
				this.pendingPromotionPos = to;
				this.view.showPromotionModal(piece.cor, (simbolo) => {
					this.promotePawn(this.pendingPromotionPos, simbolo);
				});
				return true;
			}
		}
		// 6. Troca turno
		this.currentTurn = this.currentTurn === "brancas" ? "pretas" : "brancas";
		// ** NOVO FLUXO: Sincronizar EP para o PRÓXIMO jogador **
		if (this.enPassant) {
			// 1. O alvo recém-criado no board (pelo pulo duplo) é copiado para o EnPassant.js
			this.enPassant.setTarget(this.board.enPassantTargetPos);
			// 2. O alvo é resetado no Board, para que um novo alvo não seja criado sem necessidade.
			this.board.enPassantTargetPos = null;
		}
		// FIM NOVO FLUXO
		// Loga estado de check/checkmate para o próximo jogador
		this.logCheckState(this.currentTurn);
		if (this.gameOver) return true;
		// Turno da IA
		if (this.currentTurn === "pretas") {
            if (this.aiTimerId) {
                clearTimeout(this.aiTimerId);
                this.aiTimerId = null;
            }
			this.aiTimerId = setTimeout(() => {
				if (this.gameOver) return;
				// A IA usará o estado EP que acabamos de definir
				const m = this.ai.makeMove("pretas");
				if (m) {
					const movedPiece = this.board.board[m.from];
					// IDENTIFICA SE É EN PASSANT
					let epCapturedPosAI = null;
					if (this.enPassant && movedPiece && (movedPiece.tipo === "♙" || movedPiece.tipo === "♟")) {
						epCapturedPosAI = this.enPassant.isEnPassantMove(m.from, m.to, movedPiece);
					}
					// CAPTURA CORRETA DA PEÇA ALVO (ANTES DE MOVER!)
					let capturedPieceAI = null;
					if (epCapturedPosAI !== null) {
						// captura en passant
						capturedPieceAI = this.board.board[epCapturedPosAI];
					} else {
						// captura normal
						capturedPieceAI = this.board.board[m.to];
					}
					// AGORA SIM mover
					this.board.movePiece(m.from, m.to, epCapturedPosAI);
					this.view.lastMove = { from: m.from, to: m.to };
					this.view.render();
					this.view.highlightCell(m.to);
					console.log(`HIGHLIGHT LINHA 234: ${m.to}`);
					let logMsg = `▶️ IA: ${this.indexToNotation(m.from)} -> ${this.indexToNotation(m.to)}`;
					console.log(logMsg);
					// promoção
					const moved = this.board.board[m.to];
					if (moved && moved.tipo === "♟" && this.board.row(m.to) === 7) {
						this.promotePawn(m.to, "rainha");
					}
					if (moved && moved.tipo === "♙" && this.board.row(m.to) === 0) {
						this.promotePawn(m.to, "rainha");
					}
				}
				this.aiTimerId = null;
				this.currentTurn = "brancas";
				// 11. Configura alvo EP para o próximo turno da Branca
				if (this.enPassant) {
					this.enPassant.setTarget(this.board.enPassantTargetPos); // CORRETO: Sincroniza o alvo da IA
				}
				this.board.enPassantTargetPos = null; // Limpa o estado no board (CORRETO)
				this.logCheckState(this.currentTurn);
			}, 300);
		}
		return true;
	}
	indexToNotation(i) {
    	const files = "abcdefgh";
    	const file = files[i % 8];
    	const rank = 8 - Math.floor(i / 8);
    	return `${file}${rank}`;
	}
	// ----------------------------------------------------------------------
	// ?? MÉTODO NOVO — expõe os movimentos válidos para o View
	// ----------------------------------------------------------------------
	getValidMoves(posIndex) {
		if (this.currentTurn !== "brancas") return [];
		const piece = this.board.board[posIndex];
		if (!piece || piece.cor !== "brancas") return [];
		// Delega ao MoveValidator para obter os movimentos válidos (filtrados por xeque)
		return this.validator.getPossibleMoves(posIndex);
	}
    /* ------------------------------------------------------
       ?? MÉTODO NOVO — executa a promoção após escolha do modal
    ------------------------------------------------------ */
	promotePawn(pos, escolha) {
		const piece = this.board.board[pos];
		if (!piece) return;
		const cor = piece.cor;
	    let nomePeca = "";
		// Mapeamento de SÍMBOLO para NOME (se for o caso)
		if (escolha === "♕" || escolha === "♛") nomePeca = "rainha";
		else if (escolha === "♖" || escolha === "♜") nomePeca = "torre";
		else if (escolha === "♗" || escolha === "♝") nomePeca = "bispo";
		else if (escolha === "♘" || escolha === "♞") nomePeca = "cavalo";
		else nomePeca = escolha; // Se o modal enviar "rainha" (improvável, mas seguro)
		// Mapa final que coloca o símbolo correto no tabuleiro de acordo com a cor
		const mapa = {
			rainha: cor === "brancas" ? "♕" : "♛",
			torre:  cor === "brancas" ? "♖" : "♜",
			bispo:  cor === "brancas" ? "♗" : "♝",
			cavalo: cor === "brancas" ? "♘" : "♞"
		};
	    const simboloFinal = mapa[nomePeca] || escolha; 
		piece.tipo = simboloFinal;
	
		console.log(
			`?? Promoção concluída em ${this.indexToNotation(pos)} para: ${escolha}`
		);
		this.view.hidePromotionModal();
		this.view.render();
		
		this.currentTurn = cor === "brancas" ? "pretas" : "brancas";
		// ?? Após a promoção, inicia turno da IA (se for vez das pretas)
		if (this.currentTurn === "pretas" && !this.gameOver) {
			setTimeout(() => {
				const m = this.ai.makeMove("pretas");
				if (m) {
					this.view.lastMove = { from: m.from, to: m.to };
					this.view.render();
					this.view.highlightCell(m.to);
					console.log(`HIGHLIGHT LINHA 234: ${m.to}`);
					console.log(`?? IA: ${this.indexToNotation(m.from)} ? ${this.indexToNotation(m.to)}`);
				}
				this.currentTurn = "brancas";
			}, 300);
		}
	}
	logCheckState(cor) {
		if (this.validator.isKingInCheck(cor)) {
			console.log(`?? Check em ${cor}!`);
			if (this.validator.isCheckmate(cor)) {
				console.log(`?? Checkmate! ${cor === "brancas" ? "pretas" : "brancas"} venceu!`);
				this.gameOver = true;
				// <<<< CORREÇÃO: DEFINIR 'winner' AQUI >>>>
				const winner = cor === "brancas" ? "pretas" : "brancas"; 
				this.view.onGameOver({ 
					winner: winner,
					reason: "checkmate"
				});
				if (this.ai.constructor.name === 'AI_Hard') {
					// 'winner' agora está definida e pode ser usada.
					const result = (winner === "pretas") ? 1 : -1;
                    const aiMoves = this.moveHistory.filter(m => m.color === "pretas");
                    // Adicione este log para verificar o objeto:
                    console.log("📝 GameController: Movimentos da IA sendo enviados:", aiMoves);
					this.ai.updateLearning(this.moveHistory.filter(m => m.color === "pretas"), result);
				}
			}
		}
	}
	//RESET GAME
	resetGame() {
		console.log("Reiniciando o jogo...");
		if (this.aiTimerId) {
			clearTimeout(this.aiTimerId);
			this.aiTimerId = null;
		}
		this.board = new Board();
		// recriar EnPassant
		this.enPassant = new EnPassant();
		this.enPassant.resetTarget();
		// injetar EnPassant no MoveValidator e AI
		this.validator = new MoveValidator(this.board.board, this.enPassant);
		this.ai = new AI(this.board, this.validator, this.enPassant, this.difficulty);
		this.gameOver = false;
		this.currentTurn = "brancas";
		this.lastMove = null;
		this.view.board = this.board;
		this.moveHistory = [];
		this.view.selected = null;
		this.view.lastMove = null;
		this.view.render();
		this.view.hidePromotionModal();
		console.log("Jogo reiniciado!");
	}

}
