// AI_Medium.js - v1
// Estratégia "Medium" com heurísticas: prefere capturas, evita casas atacadas,
// não repete o último movimento sem motivo, avalia sacrifícios por valor.
export class AI_Medium {
    constructor(board, validator, enPassant) {
        this.board = board;
        this.validator = validator;
        this.enPassant = enPassant;
        // guarda último movimento que esta IA executou (para evitar repetir)
        this.lastMove = null;
        // valores das peças por símbolo (fallbacks caso não reconheça)
        this.pieceValueBySymbol = {
            "♙": 1, "♟": 1,    // peão
            "♘": 3, "♞": 3,    // cavalo
            "♗": 3, "♝": 3,    // bispo
            "♖": 5, "♜": 5,    // torre
            "♕": 9, "♛": 9,    // rainha
            "♔": 1000, "♚": 1000 // rei (valor alto para evitar trocas que percam o rei)
        };
    }
    // interface pública chamada pelo AI pai / GameController
    makeMove(color) {
        console.log("Modo Medium:");
        const enemyColor = color === "brancas" ? "pretas" : "brancas";
        // 1) coletar movimentos
        let myMoves = this.getAllMovesForColor(color);
        if (myMoves.length === 0) return null;
        const enemyMoves = this.getAllMovesForColor(enemyColor);
        // 2) filtrar movimentos que repetem o último sem motivo válido
        myMoves = myMoves.filter(m => !this.isForbiddenRepeat(m));
		// regra extra: impedir mover de volta para a posição anterior apenas por voltar
		// (mesmo que não seja captura ou escape)
		// regra extra: impedir mover de volta para a posição anterior apenas por voltar
		myMoves = myMoves.filter(m => {
			if (!this.lastMove) return true;
			const isReverse = m.from === this.lastMove.to && m.to === this.lastMove.from;
			if (!isReverse) return true;
			if (m.capturedPiece) return true;
			if (this.willRemoveCheck(m)) return true;
			return false;
		});
		const threatened = this.getThreatenedPieces(color);
		if (threatened.length > 0) {
			console.log("⚠️ Tentando fugir de peças ameaçadas:", threatened.map(t => t.piece.tipo));
			const escapeMoves = myMoves.filter(m =>
				threatened.some(t => t.index === m.from) && !this.wouldBeAttackedAfterMove(m, enemyColor)
			);
			console.log("Possíveis movimentos de fuga:", escapeMoves.map(m => `${m.piece.tipo} ${this.indexToNotation(m.from)}->${this.indexToNotation(m.to)}`));
			if (escapeMoves.length > 0) {
				// priorizar capturas entre os movimentos de fuga
				const captureEscapes = escapeMoves.filter(m => m.capturedPiece);
				const chosen = captureEscapes.length > 0
					? captureEscapes[Math.floor(Math.random() * captureEscapes.length)]
					: escapeMoves[Math.floor(Math.random() * escapeMoves.length)];
				this.applyMoveWithEPAndRegister(chosen);
				this.lastMove = { from: chosen.from, to: chosen.to };
				return chosen;
			} else {
				console.log("Nenhum movimento de fuga seguro encontrado.");
			}
		}
        // 3) tentar capturas (priorizar melhores)
        const captureMoves = myMoves.filter(m => m.capturedPiece !== null);
		// filtra capturas que não deixam a peça capturada imediatamente (evitar suicídio)
		const safeCaptures = captureMoves.filter(m => !this.wouldBeAttackedAfterMove(m, enemyColor));
		// substitui captureMoves por safeCaptures se houver pelo menos uma segura
		if (safeCaptures.length > 0) {
			captureMoves.splice(0, captureMoves.length, ...safeCaptures);
		}
        if (captureMoves.length > 0) {
            const bestCapture = this.chooseBestCapture(captureMoves, color, enemyMoves);
            if (bestCapture) {
                this.applyMoveWithEPAndRegister(bestCapture);
                this.lastMove = { from: bestCapture.from, to: bestCapture.to };
                return bestCapture;
            }
        }
		// 🔥 REGRA PRINCIPAL: se existe captura, a IA deve capturar SEMPRE,
		// mesmo que a heurística chooseBestCapture não escolha uma.
		if (captureMoves.length > 0) {
			// fallback obrigatório: escolhe qualquer captura disponível
			const forcedCapture = captureMoves[Math.floor(Math.random() * captureMoves.length)];
			this.applyMoveWithEPAndRegister(forcedCapture);
			this.lastMove = { from: forcedCapture.from, to: forcedCapture.to };
			return forcedCapture;
		}
        // 4) buscar movimentos totalmente seguros (não atacados após execução)
        const safeMoves = myMoves.filter(m => !this.wouldBeAttackedAfterMove(m, enemyColor));
        if (safeMoves.length > 0) {
            // desempate: preferir movimentos que capturem peças de maior valor (mesmo sem captura aqui)
            const chosen = this.pickPreferableMove(safeMoves);
            this.applyMoveWithEPAndRegister(chosen);
            this.lastMove = { from: chosen.from, to: chosen.to };
            return chosen;
        }
        // 5) tentar movimentos que minimizam risco (menor valor do atacante possível)
        const leastRiskMoves = this.rankMovesByRisk(myMoves, enemyColor);
        if (leastRiskMoves.length > 0) {
            const chosen = leastRiskMoves[0];
            this.applyMoveWithEPAndRegister(chosen);
            this.lastMove = { from: chosen.from, to: chosen.to };
            return chosen;
        }
        // 6) fallback: escolher aleatório entre todos os movimentos
        const random = myMoves[Math.floor(Math.random() * myMoves.length)];
        this.applyMoveWithEPAndRegister(random);
        this.lastMove = { from: random.from, to: random.to };
        return random;
    }
    /* ---------------- Helper utilities ---------------- */
    // retorna lista de movimentos { from, to, piece, capturedPiece }
    getAllMovesForColor(color) {
        const moves = [];
        const boardArr = this.board.board;
        for (let from = 0; from < 64; from++) {
            const piece = boardArr[from];
            if (!piece || piece.cor !== color) continue;
            const possible = this.validator.getPossibleMoves(from) || [];
            for (const to of possible) {
                const captured = this.board.board[to] || null;
                moves.push({
                    from,
                    to,
                    piece,
                    capturedPiece: captured
                });
            }
        }
        return moves;
    }
    // evita repetir o mesmo movimento sem motivo
    isForbiddenRepeat(move) {
        if (!this.lastMove) return false;
        if (move.from === this.lastMove.from && move.to === this.lastMove.to) {
            // permitir se for captura
            if (move.capturedPiece) return false;
            // permitir se o movimento evita perda (i.e., seria atacado antes mas não depois)
            // vamos checar: se before it was threatened and after it's not -> allow
            const color = move.piece.cor;
            const enemyColor = color === "brancas" ? "pretas" : "brancas";
            const wasAttackedBefore = this.isSquareAttacked(move.from, this.getAllMovesForColor(enemyColor));
            const wouldBeAttackedAfter = this.wouldBeAttackedAfterMove(move, enemyColor);
            if (wasAttackedBefore && !wouldBeAttackedAfter) return false;
            // permitir se sair de check (simulação)
            if (this.willRemoveCheck(move)) return false;
            // caso contrário, proibimos repetir
            return true;
        }
        return false;
    }
    // escolhe melhor captura segundo ganho material (simula riscos).
	chooseBestCapture(captureMoves, myColor, enemyMoves) {
		// Para cada captura: calcular se é segura; se não for, avaliar ganho líquido
		const evaluated = captureMoves.map(m => {
			const capturedVal = this.valueOfPiece(m.capturedPiece);
			// Simula se a peça ficará atacada depois
			const wouldBeAttacked = this.wouldBeAttackedAfterMove(
				m, 
				myColor === "brancas" ? "pretas" : "brancas"
			);
			let netGain = capturedVal;
			if (wouldBeAttacked) {
				// Se atacado, estimar menor atacante que pode capturar no próximo turno
				const attackerVal = this.estimatedAttackerValueOnSquareAfterMove(
					m, 
					myColor === "brancas" ? "pretas" : "brancas"
				);
				// Se não houver atacante, attackerVal = 0
				netGain = capturedVal - attackerVal;
			}
			return { move: m, capturedVal, wouldBeAttacked, netGain };
		});
		// Filtra capturas com netGain <= 0 (evita suicídios)
		const safeEvaluated = evaluated.filter(e => e.netGain > 0);
		// Se houver capturas seguras, usar apenas elas
		const usedEvaluated = safeEvaluated.length > 0 ? safeEvaluated : evaluated;
		// Priorizar capturas com netGain > 0 e maiores capturedVal
		const positive = usedEvaluated.filter(e => e.netGain > 0);
		if (positive.length > 0) {
			// Ordenar por capturedVal desc, netGain desc
			positive.sort((a, b) => {
				if (b.capturedVal !== a.capturedVal) return b.capturedVal - a.capturedVal;
				return b.netGain - a.netGain;
			});
			// Se empate no capturedVal e netGain, escolher aleatório entre os empates
			const topVal = positive[0].capturedVal;
			const topCandidates = positive.filter(x => x.capturedVal === topVal);
			return topCandidates[Math.floor(Math.random() * topCandidates.length)].move;
		}
		// Se não tem positive netGain, talvez aceitar captura neutra (netGain === 0)
		const neutral = evaluated.filter(e => e.netGain === 0);
		if (neutral.length > 0) {
			const topVal = Math.max(...neutral.map(n => n.capturedVal));
			const topCandidates = neutral.filter(x => x.capturedVal === topVal);
			return topCandidates[Math.floor(Math.random() * topCandidates.length)].move;
		}
		// Nenhuma captura recomendada
		return null;
	}
    // verifica se um quadrado será atacado depois de aplicar move (simulação)
	wouldBeAttackedAfterMove(move, enemyColor) {
    	let attacked = false;
    	this.simulateMove(move, () => {
        	const enemyMoves = this.getAllMovesForColor(enemyColor);
        	attacked = enemyMoves.some(em => em.to === move.to);
        	console.log(`Movimento de ${move.piece.tipo} ${move.from} -> ${move.to} ` +
                    `foi simulado, atacado depois? ${attacked}`);
    	});
    	return attacked;
	}
    // estima valor do atacante que pode capturar nessa casa após move (menor valor atacante)
    estimatedAttackerValueOnSquareAfterMove(move, enemyColor) {
        let minVal = Infinity;
        this.simulateMove(move, () => {
            const enemyMoves = this.getAllMovesForColor(enemyColor);
            // todos os ataques que capturam na mesma casa
            const attackers = enemyMoves.filter(em => em.to === move.to && em.capturedPiece);
            for (const a of attackers) {
                const val = this.valueOfPiece(a.piece);
                if (val < minVal) minVal = val;
            }
        });
        if (minVal === Infinity) return 0;
        return minVal;
    }
    // calcula valor heurístico de uma peça (aceita Piece ou null)
    valueOfPiece(piece) {
        if (!piece) return 0;
        const v = this.pieceValueBySymbol[piece.tipo];
        if (v !== undefined) return v;
        // fallback: por cor (improvável) ou nome
        return 1;
    }
    // filtra e ordena movimentos por risco (menor atacante preferido)
    rankMovesByRisk(moves, enemyColor) {
        const rated = moves.map(m => {
            // se é captura e segura, alto valor
            const capturedVal = this.valueOfPiece(m.capturedPiece);
            let risk = 0;
            this.simulateMove(m, () => {
                const enemyMoves = this.getAllMovesForColor(enemyColor);
                const attackers = enemyMoves.filter(em => em.to === m.to);
                // risco medido pelo menor valor atacante (quanto pior, maior risco)
                if (attackers.length > 0) {
                    risk = Math.min(...attackers.map(a => this.valueOfPiece(a.piece)));
                } else {
                    risk = 0;
                }
            });
            // score: priorizar mínimo risco, depois maior capturedVal
            return { move: m, score: risk - capturedVal * 0.1 };
        });
        rated.sort((a, b) => a.score - b.score);
        return rated.map(r => r.move);
    }
	indexToNotation(i) {
    	const files = "abcdefgh";
    	const file = files[i % 8];
    	const rank = 8 - Math.floor(i / 8);
    	return `${file}${rank}`;
	}
    // pick preferable among safe moves: choose capture of higher value, else random
    pickPreferableMove(moves) {
        const captures = moves.filter(m => m.capturedPiece);
        if (captures.length > 0) {
            // escolher captura de maior valor
            captures.sort((a, b) => this.valueOfPiece(b.capturedPiece) - this.valueOfPiece(a.capturedPiece));
            const topVal = this.valueOfPiece(captures[0].capturedPiece);
            const topCandidates = captures.filter(c => this.valueOfPiece(c.capturedPiece) === topVal);
            return topCandidates[Math.floor(Math.random() * topCandidates.length)];
        }
        // senão aleatório
        return moves[Math.floor(Math.random() * moves.length)];
    }
    // verifica se o quadrado é atacado por enemyMoves (simples utilitária)
    isSquareAttacked(squareIndex, enemyMoves) {
        return enemyMoves.some(m => m.to === squareIndex);
    }
    // executa move no board, detectando En Passant e registrando double-step se aplicável
    applyMoveWithEPAndRegister(move) {
        if (!move) return;
        const piece = this.board.board[move.from];
        // detectar en passant (se módulo existir)
        let epCapturedPos = null;
        try {
            if (this.enPassant && typeof this.enPassant.isEnPassantMove === "function") {
                epCapturedPos = this.enPassant.isEnPassantMove(move.from, move.to, piece);
            }
        } catch (e) {
            epCapturedPos = null;
        }
        // aplicar movimento (presume que board.movePiece aceita terceiro argumento opcional)
        try {
            if (epCapturedPos !== null && epCapturedPos !== undefined) {
                // se board.movePiece suporta remoção EP via terceiro argumento
                this.board.movePiece(move.from, move.to, epCapturedPos);
            } else {
                this.board.movePiece(move.from, move.to);
            }
        } catch (e) {
            // fallback: manipular array diretamente se movePiece não aceitar terceiro argumento
            this.board.board[move.to] = this.board.board[move.from];
            this.board.board[move.from] = null;
        }
        // registrar passo duplo se disponível no módulo
        try {
            if (this.enPassant && typeof this.enPassant.registerDoubleStep === "function") {
                this.enPassant.registerDoubleStep(move.from, move.to, piece);
            }
        } catch (e) {
            // ignore
        }
    }
    // simula move diretamente no array board.board (restaura após callback)
    simulateMove(move, callback) {
        // guarda estado
        const from = move.from;
        const to = move.to;
        const originalFromPiece = this.board.board[from];
        const originalToPiece = this.board.board[to];
        // aplica simulação (movimentação simples)
        this.board.board[to] = originalFromPiece;
        this.board.board[from] = null;
        try {
            callback();
        } catch (e) {
            console.error("simulateMove callback error:", e);
        }
        // restaura
        this.board.board[from] = originalFromPiece;
        this.board.board[to] = originalToPiece;
    }
	getThreatenedPieces(color) {
		const threatened = [];
		const enemyColor = color === "brancas" ? "pretas" : "brancas";
		const enemyMoves = this.getAllMovesForColor(enemyColor);
		for (let i = 0; i < 64; i++) {
			const piece = this.board.board[i];
			if (!piece || piece.cor !== color) continue;
			if (enemyMoves.some(m => m.to === i)) {
				console.log(`⚠️ Peça ameaçada: ${piece.tipo} em ${this.indexToNotation(i)} (índice ${i})`);
				threatened.push({ index: i, piece });
			}
		}
		console.log(`Peças ameaçadas para ${color}:`, threatened.map(t => `${t.piece.tipo}@${this.indexToNotation(t.index)}`));
		return threatened;
	}
    // verifica se o move vai tirar do check (simulação)
    willRemoveCheck(move) {
        let removed = false;
        const color = this.board.board[move.from]?.cor;
        if (!color) return false;
        this.simulateMove(move, () => {
            try {
                if (this.validator && typeof this.validator.isKingInCheck === "function") {
                    removed = !this.validator.isKingInCheck(color);
                }
            } catch (e) {
                removed = false;
            }
        });
        return removed;
    }
}