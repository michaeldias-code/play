export class AI_Medium {
    // todo o código completo aqui

    constructor(board, validator, enPassant) {
        this.board = board;
        this.validator = validator;
        this.enPassant = enPassant;

        this.MAX_DEPTH = 3;

        this.pieceValue = {
            "♙": 100, "♟": 100,
            "♘": 320, "♞": 320,
            "♗": 330, "♝": 330,
            "♖": 500, "♜": 500,
            "♕": 900, "♛": 900,
            "♔": 20000, "♚": 20000
        };

        // ===== PIECE-SQUARE TABLES =====
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

    makeMove(color) {
        const moves = this.getAllMoves(color);
        let bestScore = -Infinity;
        let bestMove = null;

        for (const move of moves) {
            this.simulate(move, () => {
                const score = -this.search(
                    this.MAX_DEPTH - 1,
                    this.opponent(color),
                    color,
                    -Infinity,
                    Infinity
                );
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            });
        }

        if (bestMove) this.board.movePiece(bestMove.from, bestMove.to);
        return bestMove;
    }

    search(depth, color, root, alpha, beta) {
        const moves = this.getAllMoves(color);

        if (!moves.length) {
            if (this.validator.isKingInCheck(color)) {
                return color === root ? -Infinity : Infinity;
            }
            return 0;
        }

        if (depth === 0) return this.evaluate(root);

        let best = -Infinity;

        for (const move of moves) {
            this.simulate(move, () => {
                const score = -this.search(
                    depth - 1,
                    this.opponent(color),
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

    evaluate(color) {
        let score = 0;
        const endgame = this.isEndgame();

        for (let i = 0; i < 64; i++) {
            const p = this.board.board[i];
            if (!p) continue;

            const sign = p.cor === color ? 1 : -1;
            score += sign * this.pieceValue[p.tipo];
            score += sign * this.positional(i, p, endgame);
        }
        return score;
    }

    positional(i, p, endgame) {
        const idx = p.cor === "pretas" ? 63 - i : i;
        if (p.tipo === "♙" || p.tipo === "♟") return this.pawnTable[idx];
        if (p.tipo === "♘" || p.tipo === "♞") return this.knightTable[idx];
        if (p.tipo === "♗" || p.tipo === "♝") return this.bishopTable[idx];
        if (p.tipo === "♔" || p.tipo === "♚")
            return endgame ? this.kingEnd[idx] : this.kingMid[idx];
        return 0;
    }

    isEndgame() {
        let queens = 0;
        for (const p of this.board.board) {
            if (p && (p.tipo === "♕" || p.tipo === "♛")) queens++;
        }
        return queens === 0;
    }

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

    opponent(c) {
        return c === "brancas" ? "pretas" : "brancas";
    }
}

