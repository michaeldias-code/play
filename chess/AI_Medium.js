export class AI_Medium {
    constructor(board, validator, enPassant) {
        this.board = board;           // Tabuleiro principal (array de 64 posições)
        this.validator = validator;   // Funções de validação de movimentos
        this.enPassant = enPassant;   // Controle de en passant (se houver)

        this.MAX_DEPTH = 3;           // Profundidade da busca (ajustável)
        this.moveNumber = 0;          // Contador de movimentos (útil para heurísticas de abertura)

        // ================= MATERIAL =================
        this.pieceValue = {
            "♙": 100, "♟": 100,
            "♘": 320, "♞": 320,
            "♗": 330, "♝": 330,
            "♖": 500, "♜": 500,
            "♕": 900, "♛": 900,
            "♔": 20000, "♚": 20000
        };

        // ================= PIECE-SQUARE TABLES =================
        this.pawnTable = [
             0,  0,  0,  0,  0,  0,  0,  0,
            50, 50, 50, 50, 50, 50, 50, 50,
            10, 10, 20, 30, 30, 20, 10, 10,
             5,  5, 10, 25, 25, 10,  5,  5,
             0,  0,  0, 20, 20,  0,  0,  0,
             5, -5,-10,  0,  0,-10, -5,  5,
             5, 10, 10,-20,-20, 10, 10,  5,
             0,  0,  0,  0,  0,  0,  0,  0
        ];

        this.knightTable = [
            -50,-40,-30,-30,-30,-30,-40,-50,
            -40,-20,  0,  0,  0,  0,-20,-40,
            -30,  0, 10, 15, 15, 10,  0,-30,
            -30,  5, 15, 20, 20, 15,  5,-30,
            -30,  0, 15, 20, 20, 15,  0,-30,
            -30,  5, 10, 15, 15, 10,  5,-30,
            -40,-20,  0,  5,  5,  0,-20,-40,
            -50,-40,-30,-30,-30,-30,-40,-50
        ];

        this.bishopTable = [
            -20,-10,-10,-10,-10,-10,-10,-20,
            -10,  0,  0,  0,  0,  0,  0,-10,
            -10,  0,  5, 10, 10,  5,  0,-10,
            -10,  5,  5, 10, 10,  5,  5,-10,
            -10,  0, 10, 10, 10, 10,  0,-10,
            -10, 10, 10, 10, 10, 10, 10,-10,
            -10,  5,  0,  0,  0,  0,  5,-10,
            -20,-10,-10,-10,-10,-10,-10,-20
        ];

        this.kingMid = [
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -20,-30,-30,-40,-40,-30,-30,-20,
            -10,-20,-20,-20,-20,-20,-20,-10,
             20, 20,  0,  0,  0,  0, 20, 20,
             20, 30, 10,  0,  0, 10, 30, 20
        ];

        this.kingEnd = [
            -50,-40,-30,-20,-20,-30,-40,-50,
            -30,-20,-10,  0,  0,-10,-20,-30,
            -30,-10, 20, 30, 30, 20,-10,-30,
            -30,-10, 30, 40, 40, 30,-10,-30,
            -30,-10, 30, 40, 40, 30,-10,-30,
            -30,-10, 20, 30, 30, 20,-10,-30,
            -30,-30,  0,  0,  0,  0,-30,-30,
            -50,-30,-30,-30,-30,-30,-30,-50
        ];
    }

    // =====================================================
    // ESCOLHA PRINCIPAL DE JOGADA
    // =====================================================
    makeMove(color) {
        this.moveNumber++;
        const enemy = this.opponent(color);
        const moves = this.getAllMoves(color);

        if (!moves.length) {
            console.log("⚠️ Nenhuma jogada legal encontrada para", color);
            return null;
        }

        let bestScore = -Infinity;
        let bestMoves = [];
		
		const MAX_SCORE_THRESHOLD = 900; // Define o que consideramos "super valorizado" (ex.: captura de rainha)
		
		for (const move of moves) {
			let earlyExit = false; // flag para sair do loop
			this.simulate(move, () => {
				const score = -this.minimax(
					this.MAX_DEPTH - 1,
					enemy,
					color,
					-Infinity,
					Infinity
				);
		
				console.log(`📝 Avaliando ${this.coord(move.from)} -> ${this.coord(move.to)} | Score = ${score}`);
		
				// Early cutoff: se a jogada for super valorizada
				if (score >= MAX_SCORE_THRESHOLD) {
					bestScore = score;
					bestMoves = [move];
					earlyExit = true;
					return; // sai da simulação atual
				}
		
				// Caso normal, continua comparando
				if (score > bestScore) {
					bestScore = score;
					bestMoves = [move];
				} else if (score >= bestScore - 20) {
					bestMoves.push(move);
				}
			});
		
			// Sai do loop externo se já encontrou movimento excelente
			if (earlyExit) break;
		}


        const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];

        if (chosen) {
            console.log(`▶️ IA escolheu ${this.coord(chosen.from)} -> ${this.coord(chosen.to)} | Score final = ${bestScore}`);
            this.board.movePiece(chosen.from, chosen.to);
        }

        return chosen;
    }

    // =====================================================
    // MINIMAX COM ALFA-BETA
    // =====================================================
    minimax(depth, color, root, alpha, beta) {
        const moves = this.getAllMoves(color);

        if (!moves.length) {
            if (this.validator.isKingInCheck(color)) {
                return color === root ? -Infinity : Infinity;
            }
            return 0;
        }

        if (depth === 0) return this.evaluate(root);

        let best = -Infinity;
        const enemy = this.opponent(color);

        for (const move of moves) {
            this.simulate(move, () => {
                const score = -this.minimax(
                    depth - 1,
                    enemy,
                    root,
                    -beta,
                    -alpha
                );
                best = Math.max(best, score);
                alpha = Math.max(alpha, score);
            });
            if (alpha >= beta) break;
        }
        return best;
    }

    // =====================================================
    // AVALIAÇÃO HEAVY HEURISTICS (COM BACKUP DE PEÇAS)
    // =====================================================
// =====================================================
// AVALIAÇÃO HEURÍSTICA COMPLETA (CORRIGIDA E ROBUSTA)
// =====================================================
evaluate(color) {
    let score = 0;
    const enemy = this.opponent(color);
    const endgame = this.isEndgame();

    for (let i = 0; i < 64; i++) {
        const p = this.board.board[i];
        if (!p) continue;

        const sign = p.cor === color ? 1 : -1;
        const val = this.pieceValue[p.tipo];

        // ================= MATERIAL =================
        score += sign * val;

        // ================= POSICIONAL =================
        score += sign * this.positional(i, p, endgame);

        // ================= DESENVOLVIMENTO =================
        if (
            (p.tipo === "♘" || p.tipo === "♞" ||
             p.tipo === "♗" || p.tipo === "♝") &&
            i >= 16 && i <= 47
        ) {
            score += sign * 25;
        }

        // ================= DAMA PRECOCE =================
        if ((p.tipo === "♕" || p.tipo === "♛") && this.moveNumber < 10) {
            score -= sign * 40;
        }

        // ================= SEGURANÇA DO REI =================
        if ((p.tipo === "♔" || p.tipo === "♚") && !endgame && i >= 24 && i <= 39) {
            score -= sign * 80;
        }

        // ================= CONTROLE DO CENTRO =================
        if ([27, 28, 35, 36].includes(i)) {
            score += sign * 20;
        }

        // =====================================================
        // ANÁLISE DE AMEAÇAS (CORRIGIDA)
        // =====================================================
        const attackers = this.getAttackers(i, enemy);
        if (attackers.length === 0) continue; // não há ameaça

        const defenders = this.getAttackers(i, p.cor);

        // Caso 1: peça atacada MAS há defesa suficiente → risco reduzido
        if (defenders.length >= attackers.length) {

            // Rainha nunca deve ser exposta, mesmo com backup
            if (val >= 900) {
                score -= sign * 120;
                console.log(
                    `⚠️ Rainha ${p.tipo} em ${this.coord(i)} atacada mesmo com defesa | Penalidade = 120`
                );
            }

            // Peças menores com backup → penalidade simbólica
            continue;
        }

        // Caso 2: peça atacada SEM defesa suficiente → calcular troca real
        let worstLoss = 0;

        for (const attackerIdx of attackers) {
            const attacker = this.board.board[attackerIdx];
            if (!attacker) continue;

            const attackerVal = this.pieceValue[attacker.tipo];

            /*
                REGRA CRÍTICA (a que estava faltando):

                Só existe perda real se:
                atacante + troca resulta em perda líquida

                Ex:
                Torre (500) capturou Rainha (900)
                → mesmo que seja capturada depois, troca é +400
                → NUNCA penalizar
            */
            const exchangeLoss = val - attackerVal;

            if (exchangeLoss > 0) {
                worstLoss = Math.max(worstLoss, exchangeLoss);
            }
        }

        if (worstLoss > 0) {
            score -= sign * worstLoss;
            console.log(
                `⚠️ Peça ${p.tipo} em ${this.coord(i)} atacada sem defesa | Penalidade = -${worstLoss}`
            );
        }
    }

    // ================= MOBILIDADE =================
    const mobilityOwn = this.getAllMoves(color).length;
    const mobilityEnemy = this.getAllMoves(enemy).length;
    score += (mobilityOwn - mobilityEnemy) * 3;

    // ================= XEQUE =================
    if (this.validator.isKingInCheck(enemy)) score += 60;
    if (this.validator.isKingInCheck(color)) score -= 60;

    return score;
}

    // =====================================================
    // VALOR POSICIONAL
    // =====================================================
    positional(i, p, endgame) {
        const idx = p.cor === "pretas" ? 63 - i : i;
        if (p.tipo === "♙" || p.tipo === "♟") return this.pawnTable[idx];
        if (p.tipo === "♘" || p.tipo === "♞") return this.knightTable[idx];
        if (p.tipo === "♗" || p.tipo === "♝") return this.bishopTable[idx];
        if (p.tipo === "♔" || p.tipo === "♚")
            return endgame ? this.kingEnd[idx] : this.kingMid[idx];
        return 0;
    }

    // =====================================================
    // Verifica se uma casa é atacada
    // =====================================================
    isSquareAttacked(square, byColor) {
        return this.getAttackers(square, byColor).length > 0;
    }

    // =====================================================
    // Retorna todos atacantes de uma casa
    // =====================================================
// =====================================================
// Retorna todos atacantes reais de uma casa
// =====================================================
getAttackers(square, byColor) {
    const attackers = [];
    for (let i = 0; i < 64; i++) {
        const p = this.board.board[i];
        if (!p || p.cor !== byColor) continue;

        // Movimentos possíveis
        const moves = this.validator.getPossibleMoves(i) || [];

        // Considera ataque apenas se a casa é um destino de captura real
        for (const to of moves) {
            const target = this.board.board[to];
            // Só adiciona se houver peça inimiga ou se for peão podendo en passant
            if (target && target.cor !== byColor || 
                (p.tipo === "♙" || p.tipo === "♟") && to === this.enPassant) {
                if (to === square) attackers.push(i);
            }
        }
    }
    return attackers;
}

    // =====================================================
    // FIM DE JOGO
    // =====================================================
    isEndgame() {
        let queens = 0;
        for (const p of this.board.board) {
            if (p && (p.tipo === "♕" || p.tipo === "♛")) queens++;
        }
        return queens === 0;
    }

    // =====================================================
    // RETORNA TODAS AS JOGADAS LEGAIS
    // =====================================================
    getAllMoves(color) {
        const moves = [];
        for (let i = 0; i < 64; i++) {
            const p = this.board.board[i];
            if (!p || p.cor !== color) continue;
            for (const to of this.validator.getPossibleMoves(i) || []) {
                moves.push({ from: i, to });
            }
        }
        return moves;
    }

    // =====================================================
    // SIMULA UMA JOGADA
    // =====================================================
    simulate(move, fn) {
        const a = this.board.board[move.from];
        const b = this.board.board[move.to];
        this.board.board[move.to] = a;
        this.board.board[move.from] = null;
        try { fn(); }
        finally {
            this.board.board[move.from] = a;
            this.board.board[move.to] = b;
        }
    }

    // =====================================================
    // COR OPONENTE
    // =====================================================
    opponent(c) {
        return c === "brancas" ? "pretas" : "brancas";
    }

    // =====================================================
    // ÍNDICE PARA COORDENADA (ex: 52 -> e2)
    // =====================================================
    coord(idx) {
        const file = "abcdefgh"[idx % 8];
        const rank = 8 - Math.floor(idx / 8);
        return `${file}${rank}`;
    }
}
