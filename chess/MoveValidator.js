// MoveValidator.js - v1
export class MoveValidator {
	constructor(boardArray, enPassant = null) {
		this.board = boardArray;
		// Se o controlador/quem instanciou passou uma instância de EnPassant, usa-a.
		// Caso contrário, mantém null.
		this.enPassant = enPassant || null;
		console.log("MoveValidator carregado!");
	}
	// AUXILIAR: En Passant
	/*
	 * Retorna o índice da peça capturada se o movimento for um 'en passant' legal, ou null caso contrário.
	 * @param {number} from Índice de origem
	 * @param {number} to Índice de destino
	 * @param {Object} piece A peça que está sendo movida
	 * @returns {number|null} Índice da peça capturada ou null.
	 */
	isEnPassantMoveAndGetCapturedPos(from, to, piece) {
		// Se o módulo EnPassant não estiver plugado, não pode ser um movimento EP.
		if (!this.enPassant || typeof this.enPassant.isEnPassantMove !== 'function') {
			return null;
		}
		// O método isEnPassantMove é responsável por:
		// 1. Checar se a peça é um Peão.
		// 2. Checar se 'to' é um dos alvos EP (do estado EP atual).
		// 3. Retornar o índice do peão capturado se tudo for válido.
		try {
			// A função isEnPassantMove precisa saber de onde o peão está se movendo (from)
			// e onde ele está pousando (to) para determinar se é um movimento EP.
			const capturedPos = this.enPassant.isEnPassantMove(from, to, piece);
			// capturedPos será um número se for EP válido, ou null/falso.
			if (this.isValidPosition(capturedPos)) {
				return capturedPos;
			}
			return null;
		} catch (e) {
			//console.error("Erro na checagem de En Passant:", e);
			return null; // Nunca atrapalhar o fluxo principal
		}
	}
	// Regras básicas
	isValidPosition(pos) {
		return pos >= 0 && pos < 64;
	}
	row(pos) { return Math.floor(pos / 8); }
	col(pos) { return pos % 8; }
	sameRow(a, b) { return this.row(a) === this.row(b); }
	sameCol(a, b) { return this.col(a) === this.col(b); }
	// CHECA SE MOVIMENTO DESLIZANTE QUEBRA BORDAS
	slidingStepOk(start, next, offset) {
		const sr = this.row(start);
		const sc = this.col(start);
		const nr = this.row(next);
		const nc = this.col(next);
		switch (offset) {
			case -1: return nr === sr && nc === sc - 1;
			case 1: return nr === sr && nc === sc + 1;
			case -8: return nc === sc && nr === sr - 1;
			case 8: return nc === sc && nr === sr + 1;
			case -9: return (nr === sr - 1) && (nc === sc - 1);
			case -7: return (nr === sr - 1) && (nc === sc + 1);
			case 7: return (nr === sr + 1) && (nc === sc - 1);
			case 9: return (nr === sr + 1) && (nc === sc + 1);
			default: return false;
		}
	}
	// MOVIMENTOS DESLIZANTES
	getSlidingMoves(pos, directions) {
		const moves = [];
		const piece = this.board[pos];
		for (let d of directions) {
			let p = pos + d;
			while (this.isValidPosition(p) && this.slidingStepOk(p - d, p, d)) {
				const target = this.board[p];
				if (!target) {
					moves.push(p);
				} else {
					if (target.cor !== piece.cor) moves.push(p);
					break;
				}
				p += d;
			}
		}
		return moves;
	}
	// MOVIMENTOS DE UMA PEÇA (SEM FILTRO DE XEQUE)
	rawMoves(pos) {
		const piece = this.board[pos];
		if (!piece) return [];
		const moves = [];
		const r = this.row(pos);
		const c = this.col(pos);
		const add = (to) => {
			if (!this.isValidPosition(to)) return;
			const tgt = this.board[to];
			if (!tgt || tgt.cor !== piece.cor) moves.push(to);
		};
		switch (piece.tipo) {
			case "♙": // peão branco
				// Movimentos básicos de peão (seu código original)
				if (r > 0 && !this.board[pos - 8]) add(pos - 8);
				if (r === 6 && !this.board[pos - 8] && !this.board[pos - 16]) add(pos - 16);
				if (c > 0 && this.board[pos - 9] && this.board[pos - 9].cor === "pretas") add(pos - 9);
				if (c < 7 && this.board[pos - 7] && this.board[pos - 7].cor === "pretas") add(pos - 7);
				// En Passant: se o módulo estiver plugado, peça os alvos possíveis para este peão
				if (this.enPassant && typeof this.enPassant.getEnPassantTargetsForPawn === 'function') {
					const epTargets = this.enPassant.getEnPassantTargetsForPawn(pos);
					//console.log(`DEBUG: Peão em ${pos} checando EP. Alvos retornados:`, epTargets);
					for (let t of epTargets) {
						// Segurança: apenas adicionar se a casa de destino estiver vazia (condição de en passant)
						// E a peça capturada deve ser o Peão que acabou de se mover 2 casas
						if (this.isValidPosition(t) && !this.board[t]) {
							// A checagem real de legalidade (se existe peão adversário) será feita
							// no momento do movimento ou em isEnPassantMove. Aqui só adicionamos o alvo vazio.
							moves.push(t);
						}
					}
				}
				break;
			case "♟": // peão preto
				// Movimentos básicos de peão (seu código original)
				if (r < 7 && !this.board[pos + 8]) add(pos + 8);
				if (r === 1 && !this.board[pos + 8] && !this.board[pos + 16]) add(pos + 16);
				if (c < 7 && this.board[pos + 9] && this.board[pos + 9].cor === "brancas") add(pos + 9);
				if (c > 0 && this.board[pos + 7] && this.board[pos + 7].cor === "brancas") add(pos + 7);
				// En Passant: se o módulo estiver plugado, peça os alvos possíveis para este peão
				if (this.enPassant && typeof this.enPassant.getEnPassantTargetsForPawn === 'function') {
					const epTargets = this.enPassant.getEnPassantTargetsForPawn(pos);
					for (let t of epTargets) {
						if (this.isValidPosition(t) && !this.board[t]) {
							moves.push(t);
						}
					}
				}
				break;
			case "♖": case "♜":
				moves.push(...this.getSlidingMoves(pos, [-1,1,-8,8]));
				break;
			case "♗": case "♝":
				moves.push(...this.getSlidingMoves(pos, [-9,-7,7,9]));
				break;
			case "♕": case "♛":
				moves.push(...this.getSlidingMoves(pos, [-1,1,-8,8,-9,-7,7,9]));
				break;
			case "♘": case "♞":
				const k = [-17,-15,-10,-6,6,10,15,17];
				for (let off of k) {
					let to = pos + off;
					if (!this.isValidPosition(to)) continue;
					if (Math.abs(this.row(to) - r) + Math.abs(this.col(to) - c) === 3) {
						const tgt = this.board[to];
						if (!tgt || tgt.cor !== piece.cor) moves.push(to);
					}
				}
				break;
			case "♔": case "♚":
				const ko = [-9,-8,-7,-1,1,7,8,9];
				for (let off of ko) {
					let to = pos + off;
					if (!this.isValidPosition(to)) continue;
					if (Math.abs(this.row(to) - r) <= 1 &&
						Math.abs(this.col(to) - c) <= 1) {
						const tgt = this.board[to];
						if (!tgt || tgt.cor !== piece.cor) moves.push(to);
					}
				}
				break;
		}
		return moves;
	}
	// FILTRO DE CHEQUE
	getPossibleMoves(pos) {
		const piece = this.board[pos];
		if (!piece) return [];
		let moves = this.rawMoves(pos);
		const res = [];
        // Roque para o rei
        if (piece.tipo === "♔" || piece.tipo === "♚") {
            const color = piece.cor;
            const row = color === "brancas" ? 7 : 0;
            // Roque curto
            if (!piece.hasMoved) {
                const shortRook = this.board[row*8 + 7];
                if (shortRook && !shortRook.hasMoved) {
                    if (
                        !this.board[row*8 + 5] &&
                        !this.board[row*8 + 6] &&
                        !this.isCellAttacked(row*8 + 4, color) &&
                        !this.isCellAttacked(row*8 + 5, color) &&
                        !this.isCellAttacked(row*8 + 6, color)
                    ) moves.push(row*8 + 6);
                }
            }
            // Roque longo
            if (!piece.hasMoved) {
                const longRook = this.board[row*8 + 0];
                if (longRook && !longRook.hasMoved) {
                    if (
                        !this.board[row*8 + 1] &&
                        !this.board[row*8 + 2] &&
                        !this.board[row*8 + 3] &&
                        !this.isCellAttacked(row*8 + 4, color) &&
                        !this.isCellAttacked(row*8 + 3, color) &&
                        !this.isCellAttacked(row*8 + 2, color)
                    ) moves.push(row*8 + 2);
                }
            }
        }
		for (let to of moves) {
			if (this.wouldNotLeaveKingInCheck(pos, to)) {
				res.push(to);
			}
		}
		return res;
	}
	// Movimento ALTERADO ENPASSANT
	wouldNotLeaveKingInCheck(from, to) {
		// Segurança básica
		if (!this.isValidPosition(from) || !this.isValidPosition(to)) return false;
		const piece = this.board[from];
		if (!piece) return false;
		// Backups (simples) para restaurar o estado
		const backupFrom = this.board[from];
		const backupTo = this.board[to];
		let backupCaptured = null;
		let epCapturedIdx = null; // Índice do peão que será capturado no en passant
		// 1. Verificar se é um movimento de En Passant e obter a posição capturada
		epCapturedIdx = this.isEnPassantMoveAndGetCapturedPos(from, to, piece);
		// Aplicar o movimento na simulação:
		// mover peça de origem -> destino
		this.board[to] = this.board[from];
		this.board[from] = null;
		// 2. Se for en passant, remover também o peão capturado na simulação
		if (epCapturedIdx !== null) {
			backupCaptured = this.board[epCapturedIdx];
			this.board[epCapturedIdx] = null;
		}
		// Checar se o rei do lado da peça ficou em cheque
		let safe = true;
		try {
			safe = !this.isKingInCheck(piece.cor);
		} catch (e) {
			safe = false;
		}
		// 3. Restaurar estado original (sempre)
		this.board[from] = backupFrom;
		this.board[to] = backupTo;
		if (epCapturedIdx !== null) {
			this.board[epCapturedIdx] = backupCaptured; // Coloca o peão capturado de volta
		}
		return safe;
	}
	// CHEQUE
	isKingInCheck(color) {
		const kingPos = this.board.findIndex(p =>
			p && (
				(p.tipo === "♔" && p.cor === color) ||
				(p.tipo === "♚" && p.cor === color)
			)
		);
		if (kingPos === -1) return false;
		for (let i = 0; i < 64; i++) {
			const p = this.board[i];
			if (!p || p.cor === color) continue;
			// Nota: O rawMoves de peões aqui deve conter APENAS ataques diagonais,
			// não os alvos de en passant, pois o en passant é um MOVIMENTO,
			// não uma AMEAÇA (sem a condição EP). Seu código já faz isso!
			const moves = this.rawMoves(i);
			if (moves.includes(kingPos)) return true;
		}
		return false;
	}
    // CHEQUE-MATE
    isCheckmate(color) {
        if (!this.isKingInCheck(color)) return false;
        for (let i = 0; i < 64; i++) {
            const p = this.board[i];
            if (p && p.cor === color) {
                const moves = this.getPossibleMoves(i);
                if (moves.length > 0) return false;
            }
        }
        return true;
    }
    // CASA ATACADA
    isCellAttacked(pos, color) {
        const enemyColor = color === "brancas" ? "pretas" : "brancas";
        for (let i = 0; i < 64; i++) {
            const p = this.board[i];
            if (!p || p.cor !== enemyColor) continue;
            const moves = this.rawMoves(i);
            if (moves.includes(pos)) return true;
        }
        return false;
    }
}