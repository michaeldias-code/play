export class AI_Medium {
    constructor(board, validator, enPassant) {
        // Referências externas (motor do jogo)
        this.board = board;
        this.validator = validator;
        this.enPassant = enPassant;

        // Usado apenas para evitar repetições simples
        this.lastMove = null;

        // ===============================
        // VALORES DE MATERIAL (base do xadrez)
        // Ajustar aqui muda o quanto a IA valoriza trocas
        // ===============================
        this.pieceValueBySymbol = {
            "♙": 100, "♟": 100,
            "♘": 320, "♞": 320,
            "♗": 330, "♝": 330,
            "♖": 500, "♜": 500,
            "♕": 900, "♛": 900,
            "♔": 20000, "♚": 20000
        };

        // ===============================
        // PIECE-SQUARE TABLES
        // Bônus/penalidade por posição
        // Ajustar aqui muda estilo (centralizador, defensivo, etc.)
        // ===============================
        this.pawnTable = [...];
        this.knightTable = [...];
        this.bishopTable = [...];
        this.kingMiddleGame = [...];
    }

    // =========================================================
    // FUNÇÃO PRINCIPAL — decide a jogada
    // =========================================================
    makeMove(color) {
        const enemyColor = color === "brancas" ? "pretas" : "brancas";

        // 1. Gerar TODAS as jogadas legais
        const moves = this.getAllMovesForColor(color);
        if (!moves.length) return null;

        let bestScore = -Infinity;
        let bestMoves = [];

        // 2. Avaliar cada jogada possível
        for (const move of moves) {
            let score = 0;

            // Simula a jogada e avalia a resposta do oponente
            this.simulateMove(move, () => {
                // Negamax:
                // minha jogada é boa se a melhor resposta do inimigo é ruim
                score = -this.minimax(
                    2,              // PROFUNDIDADE (ajuste aqui o nível)
                    enemyColor,
                    color
                );
            });

            // Guardar melhores jogadas
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score >= bestScore - 30) {
                // Pequena margem para variar estilo
                bestMoves.push(move);
            }
        }

        // 3. Escolher aleatoriamente entre as melhores
        const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];

        this.applyMoveWithEPAndRegister(chosen);
        this.lastMove = { from: chosen.from, to: chosen.to };

        return chosen;
    }

    // =========================================================
    // MINIMAX SIMPLES (NEGAMAX)
    // Responsável por "olhar à frente"
    // =========================================================
    minimax(depth, currentColor, myColor) {
        // Caso base: profundidade máxima atingida
        if (depth === 0) {
            return this.evaluateBoard(myColor);
        }

        const moves = this.getAllMovesForColor(currentColor);

        // Sem jogadas → avaliar posição atual
        if (!moves.length) {
            return this.evaluateBoard(myColor);
        }

        let best = -Infinity;

        for (const move of moves) {
            this.simulateMove(move, () => {
                const score = -this.minimax(
                    depth - 1,
                    currentColor === "brancas" ? "pretas" : "brancas",
                    myColor
                );
                best = Math.max(best, score);
            });
        }

        return best;
    }

    // =========================================================
    // AVALIAÇÃO DO TABULEIRO (CORAÇÃO DA IA)
    // Tudo vira número aqui
    // =========================================================
    evaluateBoard(color) {
        let score = 0;
        const enemyColor = color === "brancas" ? "pretas" : "brancas";

        for (let i = 0; i < 64; i++) {
            const piece = this.board.board[i];
            if (!piece) continue;

            const value = this.valueOfPiece(piece);
            const sign = piece.cor === color ? 1 : -1;

            // 1. MATERIAL
            score += sign * value;

            // 2. POSIÇÃO
            score += sign * this.getPositionalValue(i, piece, piece.cor);

            // 3. PEÇA ATACADA E NÃO DEFENDIDA
            if (
                this.isSquareAttacked(i, enemyColor) &&
                !this.isSquareAttacked(i, piece.cor)
            ) {
                // Ajuste esse multiplicador para punir mais ou menos riscos
                score -= sign * value * 0.3;
            }
        }

        // 4. XEQUE (bônus simples)
        if (this.validator.isKingInCheck(enemyColor)) score += 50;
        if (this.validator.isKingInCheck(color)) score -= 50;

        return score;
    }

    // =========================================================
    // FUNÇÕES AUXILIARES DE AVALIAÇÃO
    // =========================================================

    // Verifica se uma casa é atacada por uma cor
    isSquareAttacked(square, byColor) {
        const moves = this.getAllMovesForColor(byColor);
        return moves.some(m => m.to === square);
    }

    // Retorna bônus posicional usando piece-square tables
    getPositionalValue(index, piece, color) {
        const adjusted = color === "pretas" ? 63 - index : index;

        if (piece.tipo.includes("♙") || piece.tipo.includes("♟"))
            return this.pawnTable[adjusted];
        if (piece.tipo.includes("♘") || piece.tipo.includes("♞"))
            return this.knightTable[adjusted];
        if (piece.tipo.includes("♗") || piece.tipo.includes("♝"))
            return this.bishopTable[adjusted];
        if (piece.tipo.includes("♔") || piece.tipo.includes("♚"))
            return this.kingMiddleGame[adjusted];

        return 0;
    }

    // Valor material simples
    valueOfPiece(piece) {
        return this.pieceValueBySymbol[piece.tipo] || 0;
    }

    // =========================================================
    // FUNÇÕES DE INFRAESTRUTURA (mantidas compatíveis)
    // =========================================================

    getAllMovesForColor(color) {
        const moves = [];
        for (let from = 0; from < 64; from++) {
            const piece = this.board.board[from];
            if (!piece || piece.cor !== color) continue;

            const possible = this.validator.getPossibleMoves(from) || [];
            for (const to of possible) {
                moves.push({
                    from,
                    to,
                    piece,
                    capturedPiece: this.board.board[to] || null
                });
            }
        }
        return moves;
    }

    // Simula jogada sem quebrar o estado real
    simulateMove(move, callback) {
        const from = move.from;
        const to = move.to;

        const originalFrom = this.board.board[from];
        const originalTo = this.board.board[to];

        this.board.board[to] = originalFrom;
        this.board.board[from] = null;

        try {
            callback();
        } finally {
            this.board.board[from] = originalFrom;
            this.board.board[to] = originalTo;
        }
    }

    // Aplica jogada real (com en passant, se houver)
    applyMoveWithEPAndRegister(move) {
        if (!move) return;

        const piece = this.board.board[move.from];
        let epCapturedPos = null;

        try {
            if (this.enPassant?.isEnPassantMove) {
                epCapturedPos = this.enPassant.isEnPassantMove(
                    move.from,
                    move.to,
                    piece
                );
            }
        } catch {}

        if (epCapturedPos !== null && epCapturedPos !== undefined) {
            this.board.movePiece(move.from, move.to, epCapturedPos);
        } else {
            this.board.movePiece(move.from, move.to);
        }

        try {
            this.enPassant?.registerDoubleStep?.(
                move.from,
                move.to,
                piece
            );
        } catch {}
    }
}
