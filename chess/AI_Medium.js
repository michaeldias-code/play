/**
 * AI_Medium - Motor de Xadrez com Minimax e Alfa-Beta Pruning
 * Arquitetura: Single Responsibility Principle + Strategy Pattern
 * Performance: O(b^d) com poda agressiva e cache de avaliações
 * Nível: ~1600-1800 ELO (intermediário avançado)
 */
export class AI_Medium {
    constructor(board, validator, enPassant) {
        // ===== DEPENDÊNCIAS =====
        this.board = board;
        this.validator = validator;
        this.enPassant = enPassant;

        // ===== CONFIGURAÇÃO DO MOTOR =====
        this.config = {
            maxDepth: 3,              // Profundidade de busca (ajustar conforme CPU)
            aspirationWindow: 50,     // Janela para aspiration search
            checkExtension: 1,        // Estender busca em xeques
            captureExtension: 0,      // Estender capturas críticas
            nullMoveReduction: 2,     // R-value para null-move pruning
            lmrThreshold: 3,          // Late Move Reduction após N movimentos
            futilityMargin: 200,      // Margem para futility pruning
        };

        // ===== CACHE E OTIMIZAÇÃO =====
        this.transpositionTable = new Map(); // Tabela de transposição
        this.killerMoves = [];                // Killer moves por profundidade
        this.historyTable = new Map();        // History heuristic
        this.pawnHashTable = new Map();       // Cache de estrutura de peões
        
        // ===== ESTATÍSTICAS (DEBUG) =====
        this.stats = {
            nodesSearched: 0,
            cacheHits: 0,
            cutoffs: 0,
            extensions: 0
        };

        // ===== VALORES DE MATERIAL =====
        this.PIECE_VALUES = Object.freeze({
            "♙": 100,  "♟": 100,
            "♘": 320,  "♞": 320,
            "♗": 330,  "♝": 330,
            "♖": 500,  "♜": 500,
            "♕": 900,  "♛": 900,
            "♔": 20000, "♚": 20000
        });

        // ===== PIECE-SQUARE TABLES (PST) =====
        this.pst = this.initializePST();
        
        // ===== MÁSCARAS DE CASAS (para cálculo rápido) =====
        this.CENTER_SQUARES = new Set([27, 28, 35, 36]);
        this.EXTENDED_CENTER = new Set([18, 19, 20, 21, 26, 27, 28, 29, 34, 35, 36, 37, 42, 43, 44, 45]);
        this.BACK_RANK_WHITE = new Set([56, 57, 58, 59, 60, 61, 62, 63]);
        this.BACK_RANK_BLACK = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
    }

    // =====================================================
    // INTERFACE PÚBLICA: ESCOLHA DE MOVIMENTO
    // =====================================================
    makeMove(color) {
        console.log("\n🧠 ============ TURNO DA IA ============");
        this.resetStats();
        
        const startTime = performance.now();
        const bestMove = this.findBestMove(color);
        const elapsed = (performance.now() - startTime).toFixed(1);

        if (!bestMove) {
            console.log("⚠️ Nenhum movimento legal encontrado");
            return null;
        }

        // Aplicar movimento
        this.board.movePiece(bestMove.from, bestMove.to);

        console.log(`\n✅ MOVIMENTO ESCOLHIDO: ${this.notation(bestMove.from)} → ${this.notation(bestMove.to)}`);
        console.log(`📊 Score: ${bestMove.score} | Tempo: ${elapsed}ms`);
        console.log(`🔍 Nós: ${this.stats.nodesSearched} | Cache: ${this.stats.cacheHits} | Cutoffs: ${this.stats.cutoffs}`);
        console.log("🧠 ======================================\n");

        return bestMove;
    }

    // =====================================================
    // BUSCA ITERATIVA COM ASPIRATION WINDOWS
    // =====================================================
    findBestMove(color) {
        const moves = this.generateMoves(color);
        if (moves.length === 0) return null;
        if (moves.length === 1) return { ...moves[0], score: 0 };

        // Ordenar movimentos por heurísticas (critical optimization)
        this.orderMoves(moves, color, 0);

        let bestMove = moves[0];
        let bestScore = -Infinity;
        let alpha = -Infinity;
        let beta = Infinity;

        // Iterative Deepening (busca incremental)
        for (let depth = 1; depth <= this.config.maxDepth; depth++) {
            console.log(`🔎 Profundidade ${depth}/${this.config.maxDepth}`);
            
            let currentBest = null;
            let currentScore = -Infinity;

            // Aspiration Windows (otimização para profundidades > 2)
            if (depth > 2 && bestScore > -Infinity) {
                alpha = bestScore - this.config.aspirationWindow;
                beta = bestScore + this.config.aspirationWindow;
            }

            for (const move of moves) {
                const score = this.simulate(move, () => {
                    return -this.minimax(
                        depth - 1,
                        this.opponent(color),
                        -beta,
                        -alpha,
                        color,
                        false
                    );
                });
console.log(`📊 ${this.notation(move.from)}→${this.notation(move.to)} | Score: ${score.toFixed(0)} | ${move.isCapture ? '💎 Captura' : '📍 Movimento'}`);

                if (score > currentScore) {
                    currentScore = score;
                    currentBest = move;
                    alpha = Math.max(alpha, score);
                }

                // Re-search se sair da janela
                if (score <= alpha || score >= beta) {
                    alpha = -Infinity;
                    beta = Infinity;
                }
            }

            // Atualizar melhor movimento
            if (currentBest && currentScore > bestScore) {
                bestScore = currentScore;
                bestMove = currentBest;
            }

            // Early exit se encontrar mate
            if (Math.abs(bestScore) > 10000) break;
        }

        return { ...bestMove, score: bestScore };
    }

    // =====================================================
    // MINIMAX COM ALFA-BETA PRUNING (OTIMIZADO)
    // =====================================================
    minimax(depth, color, alpha, beta, rootColor, inCheck) {
        this.stats.nodesSearched++;

        // ===== VERIFICAR CACHE (TRANSPOSITION TABLE) =====
        const hash = this.computeHash();
        const cached = this.transpositionTable.get(hash);
        if (cached && cached.depth >= depth) {
            this.stats.cacheHits++;
            if (cached.flag === 'EXACT') return cached.score;
            if (cached.flag === 'LOWERBOUND') alpha = Math.max(alpha, cached.score);
            if (cached.flag === 'UPPERBOUND') beta = Math.min(beta, cached.score);
            if (alpha >= beta) return cached.score;
        }

        // ===== CONDIÇÕES DE PARADA =====
        const moves = this.generateMoves(color);
        
        // Mate ou Stalemate
        if (moves.length === 0) {
            const kingInCheck = this.validator.isKingInCheck(color);
            if (kingInCheck) {
                // Mate: quanto mais longe da raiz, menos grave
                return color === rootColor ? -20000 + (this.config.maxDepth - depth) : 20000 - (this.config.maxDepth - depth);
            }
            return 0; // Stalemate
        }

        // Profundidade máxima → Quiescence Search
        if (depth <= 0) {
            return this.quiescence(color, alpha, beta, rootColor, 3);
        }

        // ===== EXTENSIONS (estender busca em posições críticas) =====
        if (inCheck && depth < this.config.maxDepth) {
            depth += this.config.checkExtension;
            this.stats.extensions++;
        }

        // ===== NULL MOVE PRUNING (otimização agressiva) =====
        if (depth >= 3 && !inCheck && this.hasNonPawnMaterial(color)) {
            const nullScore = -this.minimax(
                depth - 1 - this.config.nullMoveReduction,
                this.opponent(color),
                -beta,
                -beta + 1,
                rootColor,
                false
            );
            if (nullScore >= beta) {
                this.stats.cutoffs++;
                return beta; // Beta cutoff
            }
        }

        // ===== ORDENAR MOVIMENTOS =====
        this.orderMoves(moves, color, depth);

        let bestScore = -Infinity;
        let flag = 'UPPERBOUND';
        let moveCount = 0;

        for (const move of moves) {
            moveCount++;
            let score;

            // ===== LATE MOVE REDUCTION (LMR) =====
            let reduction = 0;
            if (moveCount > this.config.lmrThreshold && 
                depth >= 3 && 
                !inCheck && 
                !move.isCapture && 
                !this.givesCheck(move, color)) {
                reduction = 1;
            }

            score = this.simulate(move, () => {
                const nextInCheck = this.validator.isKingInCheck(this.opponent(color));
                
                // PVS (Principal Variation Search)
                if (moveCount === 1) {
                    return -this.minimax(
                        depth - 1 - reduction,
                        this.opponent(color),
                        -beta,
                        -alpha,
                        rootColor,
                        nextInCheck
                    );
                } else {
                    // Null window search
                    let s = -this.minimax(
                        depth - 1 - reduction,
                        this.opponent(color),
                        -alpha - 1,
                        -alpha,
                        rootColor,
                        nextInCheck
                    );
                    
                    // Re-search se necessário
                    if (s > alpha && (s < beta || reduction > 0)) {
                        s = -this.minimax(
                            depth - 1,
                            this.opponent(color),
                            -beta,
                            -alpha,
                            rootColor,
                            nextInCheck
                        );
                    }
                    return s;
                }
            });

            bestScore = Math.max(bestScore, score);

            if (score >= beta) {
                this.stats.cutoffs++;
                
                // Atualizar killer moves
                if (!move.isCapture) {
                    this.updateKillerMove(move, depth);
                }
                
                // Salvar em cache
                this.transpositionTable.set(hash, {
                    depth,
                    score: beta,
                    flag: 'LOWERBOUND'
                });
                
                return beta; // Beta cutoff
            }

            if (score > alpha) {
                alpha = score;
                flag = 'EXACT';
            }
        }

        // ===== SALVAR EM CACHE =====
        this.transpositionTable.set(hash, {
            depth,
            score: bestScore,
            flag
        });

        return bestScore;
    }

    // =====================================================
    // QUIESCENCE SEARCH (evita horizon effect)
    // =====================================================
    quiescence(color, alpha, beta, rootColor, depth) {
        this.stats.nodesSearched++;

        // Stand-pat: avaliar posição atual
        const standPat = this.evaluate(rootColor);
        
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;
        
        if (depth <= 0) return standPat;

        // Apenas capturas e xeques
        const captures = this.generateMoves(color).filter(m => m.isCapture);
        
        for (const move of captures) {
            // Delta pruning: não considerar capturas que não ajudam
            const capturedValue = this.PIECE_VALUES[this.board.board[move.to]?.tipo] || 0;
            if (standPat + capturedValue + 200 < alpha) continue;

            const score = this.simulate(move, () => {
                return -this.quiescence(
                    this.opponent(color),
                    -beta,
                    -alpha,
                    rootColor,
                    depth - 1
                );
            });

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    // =====================================================
    // FUNÇÃO DE AVALIAÇÃO COMPLETA
    // =====================================================
    evaluate(color) {
        let score = 0;
        let materialScore = 0;  // ⬅️ ADICIONAR
        let positionalScore = 0;  // ⬅️ ADICIONAR
        let threatScore = 0;  // ⬅️ ADICIONAR

        const enemy = this.opponent(color);
        const phase = this.gamePhase(); // 0=opening, 1=middlegame, 2=endgame

        // ===== MATERIAL E POSIÇÃO =====
        for (let sq = 0; sq < 64; sq++) {
            const piece = this.board.board[sq];
            if (!piece) continue;

            const sign = piece.cor === color ? 1 : -1;
            const value = this.PIECE_VALUES[piece.tipo];

            // Material
          const matGain = sign * value;
        materialScore += matGain;  // ⬅️ ADICIONAR
        score += matGain;

            // Posicional (PST)
                const posGain = sign * this.getPSTValue(sq, piece, phase);
        positionalScore += posGain;  // ⬅️ ADICIONAR
        score += posGain;

            // Mobilidade (importante!)
            const mobility = (this.validator.getPossibleMoves(sq) || []).length;
            score += sign * mobility * 2;
        }

        // ===== ESTRUTURA DE PEÕES =====
        score += this.evaluatePawnStructure(color);
        score -= this.evaluatePawnStructure(enemy);

        // ===== SEGURANÇA DO REI =====
        score += this.evaluateKingSafety(color, phase);
        score -= this.evaluateKingSafety(enemy, phase);

        // ===== CONTROLE DO CENTRO =====
        score += this.evaluateCenterControl(color) * 15;
        score -= this.evaluateCenterControl(enemy) * 15;

        // ===== PEÇAS ATACADAS/DEFENDIDAS =====
    const threats = this.evaluateThreats(color, enemy);
    threatScore = threats;  // ⬅️ ADICIONAR
    score += threats;


        // ===== BÔNUS DE DESENVOLVIMENTO (OPENING) =====
        if (phase === 0) {
            score += this.evaluateDevelopment(color) * 20;
            score -= this.evaluateDevelopment(enemy) * 20;
        }

        // ===== PAR DE BISPOS =====
        if (this.hasBishopPair(color)) score += 50;
        if (this.hasBishopPair(enemy)) score -= 50;

        // ===== XEQUE =====
        if (this.validator.isKingInCheck(enemy)) score += 50;
        if (this.validator.isKingInCheck(color)) score -= 50;

        console.log(`🎯 Avaliação Final: ${score.toFixed(0)} | Material: ${materialScore} | Posição: ${positionalScore} | Ameaças: ${threatScore}`);

        return score;
    }

    // =====================================================
    // AVALIAÇÃO DE AMEAÇAS (FIXED - SEM DOUBLE COUNTING)
    // =====================================================
    evaluateThreats(myColor, enemyColor) {
        let score = 0;

        for (let sq = 0; sq < 64; sq++) {
            const piece = this.board.board[sq];
            if (!piece) continue;

            const value = this.PIECE_VALUES[piece.tipo];
            const attackers = this.getAttackers(sq, this.opponent(piece.cor));
            const defenders = this.getAttackers(sq, piece.cor);

            // Peça não atacada → ignorar
            if (attackers.length === 0) continue;

            // ===== CÁLCULO DE TROCA (SEE - Static Exchange Evaluation) =====
            const see = this.staticExchangeEval(sq, piece.cor);

            if (piece.cor === myColor) {
                // Minha peça atacada
                if (see < 0) {
                    // Troca desfavorável
                    score += see; // see já é negativo
                } else if (value >= 900 && attackers.length > 0) {
                    // Rainha exposta (sempre ruim)
                    score -= 80;
                }
            } else {
                // Peça inimiga atacada
                if (see > 0) {
                    // Posso ganhar material
                    score += see * 0.5; // Bônus por ameaça
                }
            }
        }

        return score;
    }

    // =====================================================
    // STATIC EXCHANGE EVALUATION (SEE)
    // Calcula resultado de sequência de trocas
    // =====================================================
    staticExchangeEval(square, defendingColor) {
        const piece = this.board.board[square];
        if (!piece) return 0;

        const attackingColor = this.opponent(defendingColor);
        let gain = [this.PIECE_VALUES[piece.tipo]];
        let depth = 0;

        // Simular trocas alternadas
        let currentAttacker = this.getSmallestAttacker(square, attackingColor);
        
        while (currentAttacker !== null) {
            depth++;
            gain[depth] = this.PIECE_VALUES[this.board.board[currentAttacker]?.tipo] - gain[depth - 1];

            // Trocar atacante por defensor
            const nextColor = depth % 2 === 0 ? attackingColor : defendingColor;
            currentAttacker = this.getSmallestAttacker(square, nextColor);

            if (currentAttacker === null) break;
        }

        // Minimax nas trocas
        while (--depth > 0) {
            gain[depth - 1] = -Math.max(-gain[depth - 1], gain[depth]);
        }

        return gain[0];
    }

    // =====================================================
    // ENCONTRAR MENOR ATACANTE
    // =====================================================
    getSmallestAttacker(square, color) {
        let smallest = null;
        let smallestValue = Infinity;

        const attackers = this.getAttackers(square, color);
        for (const attacker of attackers) {
            const piece = this.board.board[attacker];
            const value = this.PIECE_VALUES[piece.tipo];
            if (value < smallestValue) {
                smallestValue = value;
                smallest = attacker;
            }
        }

        return smallest;
    }

    // =====================================================
    // AVALIAÇÕES AUXILIARES
    // =====================================================
    evaluatePawnStructure(color) {
        let score = 0;
        const pawns = this.getPieces(color, ["♙", "♟"]);

        // Peões dobrados
        const files = Array(8).fill(0);
        for (const sq of pawns) {
            files[sq % 8]++;
        }
        score -= files.filter(c => c > 1).length * 15;

        // Peões isolados
        for (const sq of pawns) {
            const file = sq % 8;
            if (file > 0 && files[file - 1] === 0 && file < 7 && files[file + 1] === 0) {
                score -= 20;
            }
        }

        // Peões passados
        for (const sq of pawns) {
            if (this.isPassedPawn(sq, color)) {
                const rank = Math.floor(sq / 8);
                const bonus = color === "brancas" ? (7 - rank) * 10 : rank * 10;
                score += bonus;
            }
        }

        return score;
    }

    evaluateKingSafety(color, phase) {
        if (phase === 2) return 0; // Não importa no endgame

        const kingSquare = this.findKing(color);
        if (kingSquare === null) return -1000;

        let safety = 0;
        const rank = Math.floor(kingSquare / 8);
        const file = kingSquare % 8;

        // Rei no centro = perigo
        if (this.EXTENDED_CENTER.has(kingSquare)) safety -= 50;

        // Peões na frente do rei
        const direction = color === "brancas" ? -8 : 8;
        for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
            const pawnSq = kingSquare + direction + (f - file);
            if (pawnSq >= 0 && pawnSq < 64) {
                const piece = this.board.board[pawnSq];
                if (piece && (piece.tipo === "♙" || piece.tipo === "♟") && piece.cor === color) {
                    safety += 10;
                }
            }
        }

        return safety;
    }

    evaluateCenterControl(color) {
        let control = 0;
        for (const sq of this.CENTER_SQUARES) {
            const attackers = this.getAttackers(sq, color);
            control += attackers.length;
        }
        return control;
    }

    evaluateDevelopment(color) {
        let developed = 0;
        const backRank = color === "brancas" ? this.BACK_RANK_WHITE : this.BACK_RANK_BLACK;

        for (const sq of backRank) {
            const piece = this.board.board[sq];
            if (!piece) continue;
            if (piece.tipo === "♘" || piece.tipo === "♞" || 
                piece.tipo === "♗" || piece.tipo === "♝") {
                developed--; // Penalidade por não desenvolver
            }
        }

        return developed;
    }

    hasBishopPair(color) {
        const bishops = this.getPieces(color, ["♗", "♝"]);
        if (bishops.length < 2) return false;

        // Verificar se estão em cores diferentes
        const colors = bishops.map(sq => (Math.floor(sq / 8) + sq % 8) % 2);
        return colors[0] !== colors[1];
    }

    // =====================================================
    // ORDENAÇÃO DE MOVIMENTOS (MVV-LVA + KILLER MOVES)
    // =====================================================
    orderMoves(moves, color, depth) {
        for (const move of moves) {
            let score = 0;

            // 1. Capturas (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
            if (move.isCapture) {
                const victim = this.PIECE_VALUES[this.board.board[move.to]?.tipo] || 0;
                const attacker = this.PIECE_VALUES[this.board.board[move.from]?.tipo] || 0;
                score += 10000 + (victim - attacker / 10);
            }

            // 2. Killer moves
            if (this.isKillerMove(move, depth)) {
                score += 5000;
            }

            // 3. History heuristic
            score += this.getHistoryScore(move);

            // 4. Xeques
            if (this.givesCheck(move, color)) {
                score += 3000;
            }

            move.orderScore = score;
        }

        moves.sort((a, b) => b.orderScore - a.orderScore);
    }

    // =====================================================
    // GERAÇÃO DE MOVIMENTOS COM METADADOS
    // =====================================================
    generateMoves(color) {
        const moves = [];
        for (let from = 0; from < 64; from++) {
            const piece = this.board.board[from];
            if (!piece || piece.cor !== color) continue;

            const destinations = this.validator.getPossibleMoves(from) || [];
            for (const to of destinations) {
                const captured = this.board.board[to];
                moves.push({
                    from,
                    to,
                    isCapture: captured !== null,
                    piece: piece.tipo,
                    orderScore: 0
                });
            }
        }
        return moves;
    }

    // =====================================================
    // HELPERS E UTILIDADES
    // =====================================================
    getAttackers(square, byColor) {
        const attackers = [];
        for (let i = 0; i < 64; i++) {
            const piece = this.board.board[i];
            if (!piece || piece.cor !== byColor) continue;

            const moves = this.validator.getPossibleMoves(i) || [];
            if (moves.includes(square)) {
                attackers.push(i);
            }
        }
        return attackers;
    }

    getPieces(color, types) {
        const pieces = [];
        for (let i = 0; i < 64; i++) {
            const p = this.board.board[i];
            if (p && p.cor === color && types.includes(p.tipo)) {
                pieces.push(i);
            }
        }
        return pieces;
    }

    findKing(color) {
        const symbols = color === "brancas" ? ["♔"] : ["♚"];
        for (let i = 0; i < 64; i++) {
            const p = this.board.board[i];
            if (p && symbols.includes(p.tipo)) return i;
        }
        return null;
    }

    isPassedPawn(square, color) {
        const file = square % 8;
        const rank = Math.floor(square / 8);
        const direction = color === "brancas" ? -1 : 1;

        for (let r = rank + direction; r >= 0 && r < 8; r += direction) {
            for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
                const sq = r * 8 + f;
                const p = this.board.board[sq];
                if (p && p.cor !== color && (p.tipo === "♙" || p.tipo === "♟")) {
                    return false;
                }
            }
        }
        return true;
    }

    gamePhase() {
        let material = 0;
        for (const p of this.board.board) {
            if (p && p.tipo !== "♔" && p.tipo !== "♚" && p.tipo !== "♙" && p.tipo !== "♟") {
                material += this.PIECE_VALUES[p.tipo];
            }
        }
        
        if (material < 1300) return 2; // Endgame
        if (material > 3000) return 0; // Opening
        return 1; // Middlegame
    }

    hasNonPawnMaterial(color) {
        for (const p of this.board.board) {
            if (p && p.cor === color && p.tipo !== "♙" && p.tipo !== "♟" && p.tipo !== "♔" && p.tipo !== "♚") {
                return true;
            }
        }
        return false;
    }

    givesCheck(move, color) {
        let check = false;
        this.simulate(move, () => {
            check = this.validator.isKingInCheck(this.opponent(color));
        });
        return check;
    }

    // ===== PST HELPERS =====
    getPSTValue(square, piece, phase) {
        const idx = piece.cor === "pretas" ? 63 - square : square;
        const type = piece.tipo;

        if (type === "♙" || type === "♟") return this.pst.pawn[idx];
        if (type === "♘" || type === "♞") return this.pst.knight[idx];
        if (type === "♗" || type === "♝") return this.pst.bishop[idx];
        if (type === "♖" || type === "♜") return this.pst.rook[idx];
        if (type === "♕" || type === "♛") return this.pst.queen[idx];
        if (type === "♔" || type === "♚") {
            return phase === 2 ? this.pst.kingEnd[idx] : this.pst.kingMid[idx];
        }
        return 0;
    }

    initializePST() {
        return {
            pawn: [
                0,  0,  0,  0,  0,  0,  0,  0,
                50, 50, 50, 50, 50, 50, 50, 50,
                10, 10, 20, 30, 30, 20, 10, 10,
                5,  5, 10, 25, 25, 10,  5,  5,
                0,  0,  0, 20, 20,  0,  0,  0,
                5, -5,-10,  0,  0,-10, -5,  5,
                5, 10, 10,-20,-20, 10, 10,  5,
                0,  0,  0,  0,  0,  0,  0,  0
            ],
            knight: [
                -50,-40,-30,-30,-30,-30,-40,-50,
                -40,-20,  0,  0,  0,  0,-20,-40,
                -30,  0, 10, 15, 15, 10,  0,-30,
                -30,  5, 15, 20, 20, 15,  5,-30,
                -30,  0, 15, 20, 20, 15,  0,-30,
                -30,  5, 10, 15, 15, 10,  5,-30,
                -40,-20,  0,  5,  5,  0,-20,-40,
                -50,-40,-30,-30,-30,-30,-40,-50
            ],
            bishop: [
                -20,-10,-10,-10,-10,-10,-10,-20,
                -10,  0,  0,  0,  0,  0,  0,-10,
                -10,  0,  5, 10, 10,  5,  0,-10,
                -10,  5,  5, 10, 10,  5,  5,-10,
                -10,  0, 10, 10, 10, 10,  0,-10,
                -10, 10, 10, 10, 10, 10, 10,-10,
                -10,  5,  0,  0,  0,  0,  5,-10,
                -20,-10,-10,-10,-10,-10,-10,-20
            ],
            rook: [
                0,  0,  0,  0,  0,  0,  0,  0,
                5, 10, 10, 10, 10, 10, 10,  5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                0,  0,  0,  5,  5,  0,  0,  0
            ],
            queen: [
                -20,-10,-10, -5, -5,-10,-10,-20,
                -10,  0,  0,  0,  0,  0,  0,-10,
                -10,  0,  5,  5,  5,  5,  0,-10,
                -5,  0,  5,  5,  5,  5,  0, -5,
                0,  0,  5,  5,  5,  5,  0, -5,
                -10,  5,  5,  5,  5,  5,  0,-10,
                -10,  0,  5,  0,  0,  0,  0,-10,
                -20,-10,-10, -5, -5,-10,-10,-20
            ],
            kingMid: [
                -30,-40,-40,-50,-50,-40,-40,-30,
                -30,-40,-40,-50,-50,-40,-40,-30,
                -30,-40,-40,-50,-50,-40,-40,-30,
                -30,-40,-40,-50,-50,-40,-40,-30,
                -20,-30,-30,-40,-40,-30,-30,-20,
                -10,-20,-20,-20,-20,-20,-20,-10,
                20, 20,  0,  0,  0,  0, 20, 20,
                20, 30, 10,  0,  0, 10, 30, 20
            ],
            kingEnd: [
                -50,-40,-30,-20,-20,-30,-40,-50,
                -30,-20,-10,  0,  0,-10,-20,-30,
                -30,-10, 20, 30, 30, 20,-10,-30,
                -30,-10, 30, 40, 40, 30,-10,-30,
                -30,-10, 30, 40, 40, 30,-10,-30,
                -30,-10, 20, 30, 30, 20,-10,-30,
                -30,-30,  0,  0,  0,  0,-30,-30,
                -50,-30,-30,-30,-30,-30,-30,-50
            ]
        };
    }

    // ===== KILLER MOVES =====
    updateKillerMove(move, depth) {
        if (!this.killerMoves[depth]) {
            this.killerMoves[depth] = [];
        }
        this.killerMoves[depth].unshift(move);
        if (this.killerMoves[depth].length > 2) {
            this.killerMoves[depth].pop();
        }
    }

    isKillerMove(move, depth) {
        if (!this.killerMoves[depth]) return false;
        return this.killerMoves[depth].some(
            k => k.from === move.from && k.to === move.to
        );
    }

    getHistoryScore(move) {
        const key = `${move.from}-${move.to}`;
        return this.historyTable.get(key) || 0;
    }

    updateHistory(move, depth) {
        const key = `${move.from}-${move.to}`;
        const current = this.historyTable.get(key) || 0;
        this.historyTable.set(key, current + depth * depth);
    }

    // ===== HASH =====
    computeHash() {
        // Zobrist hashing simplificado
        let hash = 0;
        for (let i = 0; i < 64; i++) {
            const p = this.board.board[i];
            if (p) {
                hash ^= (i + 1) * (p.tipo.charCodeAt(0) + (p.cor === "brancas" ? 1000 : 2000));
            }
        }
        return hash;
    }

    // ===== SIMULAÇÃO =====
    simulate(move, fn) {
        const fromPiece = this.board.board[move.from];
        const toPiece = this.board.board[move.to];
        
        this.board.board[move.to] = fromPiece;
        this.board.board[move.from] = null;
        
        try {
            return fn();
        } finally {
            this.board.board[move.from] = fromPiece;
            this.board.board[move.to] = toPiece;
        }
    }

    // ===== UTILIDADES =====
    opponent(color) {
        return color === "brancas" ? "pretas" : "brancas";
    }

    notation(square) {
        const file = "abcdefgh"[square % 8];
        const rank = 8 - Math.floor(square / 8);
        return `${file}${rank}`;
    }

    resetStats() {
        this.stats = {
            nodesSearched: 0,
            cacheHits: 0,
            cutoffs: 0,
            extensions: 0
        };
    }

    // ===== LIMPEZA DE CACHE (opcional - chamar periodicamente) =====
    clearCaches() {
        this.transpositionTable.clear();
        this.historyTable.clear();
        this.killerMoves = [];
        this.pawnHashTable.clear();
        console.log("🧹 Caches limpos");
    }

    // ===== CONFIGURAÇÃO DINÂMICA =====
    setDepth(depth) {
        this.config.maxDepth = Math.max(1, Math.min(6, depth));
        console.log(`📊 Profundidade ajustada para ${this.config.maxDepth}`);
    }

    setAggressiveness(level) {
        // level: 0=defensivo, 1=balanceado, 2=agressivo
        if (level === 0) {
            this.config.aspirationWindow = 30;
            this.config.nullMoveReduction = 1;
        } else if (level === 2) {
            this.config.aspirationWindow = 70;
            this.config.nullMoveReduction = 3;
        }
        console.log(`⚔️ Agressividade ajustada para nível ${level}`);
    }
}


