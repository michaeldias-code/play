// Board.js - v1
import { Piece } from './Piece.js';
export class Board {
    // A posição alvo de en passant (o quadrado vazio atrás do peão que moveu 2 casas)
    // Armazenada no Board para ser acessada pelo GameController/MoveValidator.
    // Use 'null' se não houver alvo EP.
    enPassantTargetPos = null; 
    constructor() {
        console.log("Board construído!");
        this.board = Array(64).fill(null);
        this.setupPieces();
    }
    setupPieces() {
        console.log("Board: posicionando peças...");
        // ---------------------------
        // Peões pretos (linha 2)
        // ---------------------------
        for (let i = 8; i < 16; i++)
            this.board[i] = new Piece("♟", "pretas");
        // ---------------------------
        // Peões brancos (linha 7)
        // ---------------------------
        for (let i = 48; i < 56; i++)
            this.board[i] = new Piece("♙", "brancas");
        // ---------------------------
        // Torres
        // ---------------------------
        this.board[0]  = new Piece("♜", "pretas");
        this.board[7]  = new Piece("♜", "pretas");
        this.board[56] = new Piece("♖", "brancas");
        this.board[63] = new Piece("♖", "brancas");
        // ---------------------------
        // Cavalos
        // ---------------------------
        this.board[1]  = new Piece("♞", "pretas");
        this.board[6]  = new Piece("♞", "pretas");
        this.board[57] = new Piece("♘", "brancas");
        this.board[62] = new Piece("♘", "brancas");
        // ---------------------------
        // Bispos
        // ---------------------------
        this.board[2]  = new Piece("♝", "pretas");
        this.board[5]  = new Piece("♝", "pretas");
        this.board[58] = new Piece("♗", "brancas");
        this.board[61] = new Piece("♗", "brancas");
        // ---------------------------
        // Rainhas
        // ---------------------------
        this.board[3]  = new Piece("♛", "pretas");
        this.board[59] = new Piece("♕", "brancas");
        // ---------------------------
        // Reis
        // ---------------------------
        this.board[4]  = new Piece("♚", "pretas");
        this.board[60] = new Piece("♔", "brancas");
        console.log("Board pronto!");
    }
    // Reseta o tabuleiro para a posição inicial
    resetBoard() {
        console.log("Resetando tabuleiro...");
        this.board = Array(64).fill(null);
        this.setupPieces();
    }
    movePiece(from, to) {
        this.board[to] = this.board[from];
        this.board[from] = null;
    }
	row(i) {
        return Math.floor(i / 8);
    }
    notationToIndex(pos) {
        const files = "abcdefgh";
        const file = files.indexOf(pos[0].toLowerCase()); // coluna: a-h
        const rank = 8 - parseInt(pos[1]);               // linha: 1-8
        if (file < 0 || rank < 0 || rank > 7) return null; // checa validade
        return rank * 8 + file;
    }
    indexToNotation(i) {
    	const files = "abcdefgh";
    	const file = files[i % 8];
    	const rank = 8 - Math.floor(i / 8);
    	return `${file}${rank}`;
	}
    setupPieces() {
        console.log("Board: posicionando peças...");
        // ---------------------------
        // Peões pretos (linha 2)
        // ---------------------------
        for (let i = 8; i < 16; i++)
            this.board[i] = new Piece("♟", "pretas");
        // ---------------------------
        // Peões brancos (linha 7)
        // ---------------------------
        for (let i = 48; i < 56; i++)
            this.board[i] = new Piece("♙", "brancas");
        // ---------------------------
        // Torres
        // ---------------------------
        this.board[0]  = new Piece("♜", "pretas");
        this.board[7]  = new Piece("♜", "pretas");
        this.board[56] = new Piece("♖", "brancas");
        this.board[63] = new Piece("♖", "brancas");
        // ---------------------------
        // Cavalos
        // ---------------------------
        this.board[1]  = new Piece("♞", "pretas");
        this.board[6]  = new Piece("♞", "pretas");
        this.board[57] = new Piece("♘", "brancas");
        this.board[62] = new Piece("♘", "brancas");
        // ---------------------------
        // Bispos
        // ---------------------------
        this.board[2]  = new Piece("♝", "pretas");
        this.board[5]  = new Piece("♝", "pretas");
        this.board[58] = new Piece("♗", "brancas");
        this.board[61] = new Piece("♗", "brancas");
        // ---------------------------
        // Rainhas
        // ---------------------------
        this.board[3]  = new Piece("♛", "pretas");
        this.board[59] = new Piece("♕", "brancas");
        // ---------------------------
        // Reis
        // ---------------------------
        this.board[4]  = new Piece("♚", "pretas");
        this.board[60] = new Piece("♔", "brancas");
        console.log("Board pronto!");
    }
    resetBoard() {
        console.log("Resetando tabuleiro...");
        this.board = Array(64).fill(null);
        this.enPassantTargetPos = null; // Zera o estado EP no reset
        this.setupPieces();
    }
    notationToIndex(pos) {
        const files = "abcdefgh";
        const file = files.indexOf(pos[0].toLowerCase());
        const rank = 8 - parseInt(pos[1]);
        if (file < 0 || rank < 0 || rank > 7) return null;
        return rank * 8 + file;
    }
    indexToNotation(i) {
    	const files = "abcdefgh";
    	const file = files[i % 8];
    	const rank = 8 - Math.floor(i / 8);
    	return `${file}${rank}`;
	}
	/**
	 * Remove uma peça do tabuleiro em um índice específico.
	 * Útil para a remoção da peça capturada no En Passant.
	 * @param {number} posIndex
	 */
	removePiece(posIndex) {
		if (posIndex >= 0 && posIndex < 64) {
			this.board[posIndex] = null;
		}
	}
    /**
     * Move uma peça e aplica a lógica de captura simples ou En Passant.
     * @param {number} from Índice de origem
     * @param {number} to Índice de destino
     * @param {number|null} epCapturedPos Se for En Passant, o índice da peça que deve ser removida (adjacente).
     */
    movePiece(from, to, epCapturedPos = null) {
        const piece = this.board[from];
        if (!piece) return false;
        // 1. Aplica o movimento básico
        this.board[to] = piece;
        this.board[from] = null;
        // 2. Lógica especial para En Passant
        if (epCapturedPos !== null && epCapturedPos !== undefined) {
			// Verifica se a casa a ser capturada está dentro do limite e contém uma peça
			if (epCapturedPos >= 0 && epCapturedPos < 64 && this.board[epCapturedPos]) {
				console.log(`Board: Captura En Passant! Removendo peça em ${this.indexToNotation(epCapturedPos)}`);
				this.board[epCapturedPos] = null;
			}
        }
        // 3. Atualiza o estado da peça (útil para Roque/Peão de 2 casas)
        if (piece.hasMoved === false) {
             piece.hasMoved = true;
        }
        // 4. Marca o movimento de duas casas do Peão para uso no próximo turno (En Passant)
        // Esta lógica DEVE ser gerenciada e limpa no GameController.
        this.enPassantTargetPos = this.calculateEnPassantTarget(from, to, piece);
        return true;
    }
    /**
     * Calcula o alvo de En Passant se o movimento foi um avanço de duas casas de Peão.
     * @param {number} from Índice de origem
     * @param {number} to Índice de destino
     * @param {Object} piece Peça que se moveu
     * @returns {number|null} Posição alvo (para onde o peão EP se moveria) ou null.
     */
    calculateEnPassantTarget(from, to, piece) {
        const type = piece.tipo;
        const color = piece.cor;
        // Checa se é um peão
        if (type !== '♙' && type !== '♟') {
            return null;
        }
        const rowFrom = Math.floor(from / 8);
        const rowTo = Math.floor(to / 8);
        // Checa se moveu 2 casas (diferença de 2 linhas)
        if (Math.abs(rowFrom - rowTo) === 2) {
            // Branco move de 7 -> 5 (índices 48-55 -> 32-39). Alvo EP é a linha 6 (pos + 8)
            if (color === 'brancas') {
                return to + 8; // Casa atrás do peão branco movido
            } 
            // Preto move de 2 -> 4 (índices 8-15 -> 24-31). Alvo EP é a linha 3 (pos - 8)
            else if (color === 'pretas') {
                return to - 8; // Casa atrás do peão preto movido
            }
        }
        return null;
    }
    // |||||||||||||||---------------- Testes simulados ----------------|||||||||||||||
    getPiece(posNotation) {
        let posIndex = this.notationToIndex(posNotation);
        return this.board[posIndex];
    }
	moveOrSetPiece(fromNotation, toNotation) {
		const fromIndex = this.notationToIndex(fromNotation);
		const toIndex = this.notationToIndex(toNotation);
		// Chamada ao novo método de movimento, sem En Passant na simulação simples
		const success = this.movePiece(fromIndex, toIndex);
		if (success) {
			const piece = this.board[toIndex];
			console.log(`Movido ${piece.tipo} de ${fromNotation} para ${toNotation}`);
		} else {
			console.log(`Nenhuma peça em ${fromNotation} ou movimento falhou.`);
		}
	}
	printBoard() {
		console.log(""); // linha extra para separar
		for (let r = 0; r < 8; r++) {
		     let row = "";
		     for (let c = 0; c < 8; c++) {
		         const p = this.board[r * 8 + c];
		         row += p ? p.tipo : ".";
		         row += " ";
		     }
			 console.log(row);
		}
		console.log(""); // linha extra para separar
	}
    testCommand(command, args) {
        switch (command) {
            case "enpassant":
                // Simula uma captura en passant - Esta lógica será reescrita no GameController
                // Apenas para testes diretos no board, se necessário
                return {
                    legal: true,
                    captured: this.enPassantTargetPos !== null ? this.enPassantTargetPos : null,
                    from: args.from,
                    to: args.to
                };
            default:
                return { error: "Comando não reconhecido" };
        }
    }
}