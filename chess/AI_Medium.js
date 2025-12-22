export class AI_Medium {
    constructor(board, validator, enPassant) {
        this.board = board;           // Tabuleiro principal (array de 64 posições)
        this.validator = validator;   // Funções de validação de movimentos
        this.enPassant = enPassant;   // Controle de en passant (se houver)

        this.MAX_DEPTH = 3;           // Profundidade da busca (pode ajustar para dificultar/facilitar)
        this.moveNumber = 0;          // Conta quantos lances já foram feitos (útil para heurísticas de abertura)

        // ================= MATERIAL =================
        // Valor das peças usado na avaliação
        this.pieceValue = {
            "♙": 100, "♟": 100,
            "♘": 320, "♞": 320,
            "♗": 330, "♝": 330,
            "♖": 500, "♜": 500,
            "♕": 900, "♛": 900,
            "♔": 20000, "♚": 20000
        };

        // ================= PIECE-SQUARE TABLES =================
        // Valores posicionais das peças
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
    // MAIN MOVE SELECTION
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

        // Avalia cada jogada possível
        for (const move of moves) {
            this.simulate(move, () => {
                const score = -this.minimax(
                    this.MAX_DEPTH - 1,
                    enemy,
                    color,
                    -Infinity,
                    Infinity
                );

                // Log da avaliação individual
                console.log(`📝 Avaliando ${this.coord(move.from)} -> ${this.coord(move.to)} | Score = ${score}`);

                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [move];
                } else if (score >= bestScore - 20) {
                    bestMoves.push(move); // margem para diversidade
                }
            });
        }

        const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];

        if (chosen) {
            console.log(`▶️ IA escolheu ${this.coord(chosen.from)} -> ${this.coord(chosen.to)} | Score final = ${bestScore}`);
            this.board.movePiece(chosen.from, chosen.to);
        }

        return chosen;
    }

    // =====================================================
    // MINIMAX COM ALPHA-BETA
    // =====================================================
    minimax(depth, color, root, alpha, beta) {
        const moves = this.getAllMoves(color);

        if (!moves.length) {
            // Se sem jogadas → xeque ou empate
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
            if (alpha >= beta) break; // poda alfa-beta
        }
        return best;
    }

    // =====================================================
    // HEAVY HEURISTIC EVALUATION
    // =====================================================
    evaluate(color) {
        let score = 0;
        const enemy = this.opponent(color);
        const endgame = this.isEndgame();

        let mobilityOwn = 0;
        let mobilityEnemy = 0;

        for (let i = 0; i < 64; i++) {
            const p = this.board.board[i];
            if (!p) continue;

            const sign = p.cor === color ? 1 : -1;
            const val = this.pieceValue[p.tipo];

            // Material puro
            score += sign * val;

            // Valor posicional
            score += sign * this.positional(i, p, endgame);

            // Heurísticas adicionais:
            // -----------------------------
            // Desenvolvimento de peças menores
            if ((p.tipo === "♘" || p.tipo === "♞" ||
                 p.tipo === "♗" || p.tipo === "♝") && i >= 16 && i <= 47) {
                score += sign * 25;
            }

            // Penalidade para dama cedo
            if ((p.tipo === "♕" || p.tipo === "♛") && this.moveNumber < 10) {
                score -= sign * 40;
            }

            // Segurança do rei
            if ((p.tipo === "♔" || p.tipo === "♚") && !endgame && i >= 24 && i <= 39) {
                score -= sign * 80;
            }

            // Controle do centro
            if ([27, 28, 35, 36].includes(i)) score += sign * 20;

            // Peça pendurada (ataque sem defesa)
            if (this.isSquareAttacked(i, enemy) && !this.isSquareAttacked(i, p.cor)) {
                score -= sign * val * 0.4;
                console.log(`⚠️ Peça ${p.tipo} em ${this.coord(i)} atacada e não defendida`);
            }
        }

        // Mobilidade
        mobilityOwn = this.getAllMoves(color).length;
        mobilityEnemy = this.getAllMoves(enemy).length;
        score += (mobilityOwn - mobilityEnemy) * 3;

        // Xeque
        if (this.validator.isKingInCheck(enemy)) score += 60;
        if (this.validator.isKingInCheck(color)) score -= 60;

        return score;
    }

    // =====================================================
    // Função auxiliar: valor posicional
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
        for (let i = 0; i < 64; i++) {
            const p = this.board.board[i];
            if (!p || p.cor !== byColor) continue;
            const moves = this.validator.getPossibleMoves(i) || [];
            if (moves.includes(square)) return true;
        }
        return false;
    }

    // =====================================================
    // Fim de jogo / fase final
    // =====================================================
    isEndgame() {
        let queens = 0;
        for (const p of this.board.board) {
            if (p && (p.tipo === "♕" || p.tipo === "♛")) queens++;
        }
        return queens === 0;
    }

    // =====================================================
    // Retorna todas as jogadas legais de uma cor
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
    // Simula uma jogada sem alterar o tabuleiro real
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
    // Cor oponente
    // =====================================================
    opponent(c) {
        return c === "brancas" ? "pretas" : "brancas";
    }

    // =====================================================
    // Converte índice para coordenada tipo 'e4'
    // =====================================================
    coord(idx) {
        const file = "abcdefgh"[idx % 8];
        const rank = 8 - Math.floor(idx / 8);
        return `${file}${rank}`;
    }
}
