// AI_Medium.js v2
// Estratégia melhorada com avaliação posicional, táticas avançadas e planejamento estratégico
export class AI_Medium {
    constructor(board, validator, enPassant) {
        this.board = board;
        this.validator = validator;
        this.enPassant = enPassant;
        this.lastMove = null;
        
        // Valores das peças
        this.pieceValueBySymbol = {
            "♙": 100, "♟": 100,
            "♘": 320, "♞": 320,
            "♗": 330, "♝": 330,
            "♖": 500, "♜": 500,
            "♕": 900, "♛": 900,
            "♔": 20000, "♚": 20000
        };
        
        // Tabelas de valores posicionais (piece-square tables)
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
        
        this.kingMiddleGame = [
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -20,-30,-30,-40,-40,-30,-30,-20,
            -10,-20,-20,-20,-20,-20,-20,-10,
            20, 20,  0,  0,  0,  0, 20, 20,
            20, 30, 10,  0,  0, 10, 30, 20
        ];
    }

    makeMove(color) {
        console.log("🧠 Modo Medium Avançado:");
        const enemyColor = color === "brancas" ? "pretas" : "brancas";
        
        let myMoves = this.getAllMovesForColor(color);
        if (myMoves.length === 0) return null;
        
        // Filtrar movimentos que repetem sem motivo
        myMoves = this.filterRepeatingMoves(myMoves);
        
        // 1. VERIFICAR XEQUE-MATE EM UM MOVIMENTO
        const checkmateMoves = this.findCheckmateMoves(myMoves, enemyColor);
        if (checkmateMoves.length > 0) {
            console.log("♔ XEQUE-MATE ENCONTRADO!");
            const chosen = checkmateMoves[0];
            this.applyMoveWithEPAndRegister(chosen);
            this.lastMove = { from: chosen.from, to: chosen.to };
            return chosen;
        }
        
        // 2. ESCAPAR DE XEQUE (prioridade máxima)
        if (this.validator.isKingInCheck(color)) {
            console.log("⚠️ REI EM XEQUE - Buscando escape");
            const escapeCheck = this.findBestCheckEscape(myMoves, color, enemyColor);
            if (escapeCheck) {
                this.applyMoveWithEPAndRegister(escapeCheck);
                this.lastMove = { from: escapeCheck.from, to: escapeCheck.to };
                return escapeCheck;
            }
        }
        
        // 3. TÁTICAS: Garfos, Espetos, Cravadas
        const tacticalMoves = this.findTacticalMoves(myMoves, enemyColor);
        if (tacticalMoves.length > 0) {
            console.log("⚔️ Movimento tático encontrado!");
            const best = this.evaluateAndChooseBest(tacticalMoves, color, enemyColor);
            if (best && best.score > 200) {
                this.applyMoveWithEPAndRegister(best.move);
                this.lastMove = { from: best.move.from, to: best.move.to };
                return best.move;
            }
        }
        
        // 4. SALVAR PEÇAS AMEAÇADAS (análise de ameaças)
        const threatened = this.getThreatenedPieces(color);
        if (threatened.length > 0) {
            const escapeMoves = this.findSafeEscapeMoves(myMoves, threatened, enemyColor);
            if (escapeMoves.length > 0) {
                console.log("🛡️ Salvando peça ameaçada");
                const best = this.evaluateAndChooseBest(escapeMoves, color, enemyColor);
                this.applyMoveWithEPAndRegister(best.move);
                this.lastMove = { from: best.move.from, to: best.move.to };
                return best.move;
            }
        }
        
        // 5. CAPTURAS FAVORÁVEIS (com análise profunda)
        const captureMoves = myMoves.filter(m => m.capturedPiece !== null);
        if (captureMoves.length > 0) {
            // FILTRO CRÍTICO: verificar se cada captura vale a pena
            const worthItCaptures = captureMoves.filter(m => this.isCaptureWorthIt(m, color, enemyColor));
            
            if (worthItCaptures.length > 0) {
                const bestCapture = this.evaluateCapturesWithSEE(worthItCaptures, color, enemyColor);
                if (bestCapture && bestCapture.score > 0) {
                    console.log(`💎 Captura favorável: ganho líquido de ${bestCapture.score}`);
                    this.applyMoveWithEPAndRegister(bestCapture.move);
                    this.lastMove = { from: bestCapture.move.from, to: bestCapture.move.to };
                    return bestCapture.move;
                }
            } else {
                console.log("⚠️ Todas as capturas disponíveis resultam em perda material - ignorando");
            }
        }
        
        // 6. DESENVOLVIMENTO E CONTROLE DO CENTRO (early game)
        if (this.isEarlyGame()) {
            const developmentMoves = this.findDevelopmentMoves(myMoves, color);
            if (developmentMoves.length > 0) {
                console.log("📈 Movimento de desenvolvimento");
                const best = this.evaluateAndChooseBest(developmentMoves, color, enemyColor);
                this.applyMoveWithEPAndRegister(best.move);
                this.lastMove = { from: best.move.from, to: best.move.to };
                return best.move;
            }
        }
        
        // 7. MELHOR MOVIMENTO POSICIONAL (avaliação completa)
        console.log("🎯 Escolhendo melhor movimento posicional");
        const best = this.evaluateAndChooseBest(myMoves, color, enemyColor);
        this.applyMoveWithEPAndRegister(best.move);
        this.lastMove = { from: best.move.from, to: best.move.to };
        return best.move;
    }

    // ============ AVALIAÇÃO DE MOVIMENTOS ============
    
    evaluateAndChooseBest(moves, color, enemyColor) {
        const evaluated = moves.map(m => ({
            move: m,
            score: this.evaluateMove(m, color, enemyColor)
        }));
        
        evaluated.sort((a, b) => b.score - a.score);
        
        // Adicionar aleatoriedade aos melhores movimentos (top 3)
        const topScore = evaluated[0].score;
        const topMoves = evaluated.filter(e => e.score >= topScore - 50);
        
        return topMoves[Math.floor(Math.random() * topMoves.length)];
    }

    evaluateMove(move, color, enemyColor) {
        let score = 0;
        
        // 1. Valor da captura
        if (move.capturedPiece) {
            score += this.valueOfPiece(move.capturedPiece);
        }
        
        // 2. Valor posicional (piece-square tables)
        score += this.getPositionalValue(move.to, move.piece, color);
        score -= this.getPositionalValue(move.from, move.piece, color);
        
        // 3. Penalidade se a peça ficar atacada
        if (this.wouldBeAttackedAfterMove(move, enemyColor)) {
            const pieceValue = this.valueOfPiece(move.piece);
            const attackerValue = this.estimatedAttackerValueOnSquareAfterMove(move, enemyColor);
            
            if (attackerValue < pieceValue) {
                score -= (pieceValue - attackerValue);
            }
        }
        
        // 4. Bônus por dar xeque
        if (this.givesCheck(move, enemyColor)) {
            score += 50;
        }
        
        // 5. Controle de casas centrais
        if (this.isCentralSquare(move.to)) {
            score += 30;
        }
        
        // 6. Mobilidade (quantas casas a peça controla)
        score += this.calculateMobilityBonus(move, color) * 5;
        
        // 7. Proteção de peças aliadas
        if (this.protectsAlly(move, color)) {
            score += 20;
        }
        
        // 8. Ameaça a peças inimigas
        const threatenedValue = this.calculateThreatenedValue(move, enemyColor);
        score += threatenedValue * 0.3;
        
        return score;
    }

    // ============ TÁTICAS AVANÇADAS ============
    
    findCheckmateMoves(moves, enemyColor) {
        return moves.filter(move => {
            let isCheckmate = false;
            this.simulateMove(move, () => {
                if (this.validator.isKingInCheck(enemyColor)) {
                    const enemyResponses = this.getAllMovesForColor(enemyColor);
                    isCheckmate = enemyResponses.length === 0;
                }
            });
            return isCheckmate;
        });
    }

    findTacticalMoves(moves, enemyColor) {
        const tactical = [];
        
        for (const move of moves) {
            // Garfo: atacar múltiplas peças
            const fork = this.createsFork(move, enemyColor);
            if (fork) {
                tactical.push(move);
                continue;
            }
            
            // Ataque descoberto
            if (this.createsDiscoveredAttack(move, enemyColor)) {
                tactical.push(move);
                continue;
            }
            
            // Ameaça de captura valiosa
            if (this.threatensMajorPiece(move, enemyColor)) {
                tactical.push(move);
            }
        }
        
        return tactical;
    }

    createsFork(move, enemyColor) {
        let forksMultiple = false;
        this.simulateMove(move, () => {
            const attacks = this.getAttacksFromSquare(move.to, move.piece);
            const valuableTargets = attacks.filter(target => {
                const piece = this.board.board[target];
                return piece && piece.cor === enemyColor && 
                       this.valueOfPiece(piece) >= 300;
            });
            forksMultiple = valuableTargets.length >= 2;
        });
        return forksMultiple;
    }

    createsDiscoveredAttack(move, enemyColor) {
        // Detecta se ao mover uma peça, outra peça aliada ataca algo valioso
        const fromSquare = move.from;
        let discoversAttack = false;
        
        this.simulateMove(move, () => {
            const color = move.piece.cor;
            const allMoves = this.getAllMovesForColor(color);
            
            for (const m of allMoves) {
                if (m.from === fromSquare) continue;
                if (m.capturedPiece && this.valueOfPiece(m.capturedPiece) >= 300) {
                    discoversAttack = true;
                    break;
                }
            }
        });
        
        return discoversAttack;
    }

    threatensMajorPiece(move, enemyColor) {
        let threatens = false;
        this.simulateMove(move, () => {
            const attacks = this.getAttacksFromSquare(move.to, move.piece);
            threatens = attacks.some(target => {
                const piece = this.board.board[target];
                return piece && piece.cor === enemyColor && 
                       this.valueOfPiece(piece) >= 500;
            });
        });
        return threatens;
    }

    // ============ STATIC EXCHANGE EVALUATION (SEE) ============
    
    evaluateCapturesWithSEE(captures, color, enemyColor) {
        const evaluated = captures.map(move => {
            const see = this.staticExchangeEvaluation(move, color, enemyColor);
            return { move, score: see };
        });
        
        evaluated.sort((a, b) => b.score - a.score);
        
        // FILTRO RIGOROSO: só aceita capturas com ganho líquido positivo
        const profitable = evaluated.filter(e => e.score > 0);
        
        if (profitable.length === 0) {
            console.log("❌ Nenhuma captura lucrativa encontrada (todas perdem material)");
            return null;
        }
        
        console.log(`✅ ${profitable.length} capturas lucrativas encontradas`);
        return profitable[Math.floor(Math.random() * Math.min(3, profitable.length))];
    }

    staticExchangeEvaluation(move, color, enemyColor) {
        const capturedValue = this.valueOfPiece(move.capturedPiece);
        const myPieceValue = this.valueOfPiece(move.piece);
        
        // Verificação básica: não capturar peça de menor valor com peça de maior valor
        // se a casa estiver defendida (REGRA CRÍTICA)
        let wouldLosePiece = false;
        let lowestEnemyAttacker = Infinity;
        
        this.simulateMove(move, () => {
            const attackers = this.getAttackersOnSquare(move.to, enemyColor);
            
            if (attackers.length > 0) {
                wouldLosePiece = true;
                lowestEnemyAttacker = Math.min(...attackers.map(a => this.valueOfPiece(a.piece)));
                console.log(`⚠️ Captura de ${move.capturedPiece.tipo} (${capturedValue}) com ${move.piece.tipo} (${myPieceValue})`);
                console.log(`   Casa defendida por peça de valor ${lowestEnemyAttacker}`);
            }
        });
        
        // CÁLCULO DO GANHO LÍQUIDO
        let netGain = capturedValue;
        
        if (wouldLosePiece) {
            // Pior caso: vou perder minha peça na resposta
            netGain -= myPieceValue;
            
            // Melhor caso: posso recapturar com peça de menor valor
            let canDefend = false;
            this.simulateMove(move, () => {
                const defenders = this.getAttackersOnSquare(move.to, color);
                if (defenders.length > 0) {
                    const lowestDefender = Math.min(...defenders.map(d => this.valueOfPiece(d.piece)));
                    // Se tenho defensor mais barato que o atacante inimigo
                    if (lowestDefender < lowestEnemyAttacker) {
                        netGain += lowestEnemyAttacker;
                        canDefend = true;
                        console.log(`   ✅ Posso defender com peça de valor ${lowestDefender}`);
                    }
                }
            });
            
            if (!canDefend) {
                console.log(`   ❌ Não posso defender adequadamente - perco ${myPieceValue - capturedValue}`);
            }
        } else {
            console.log(`✅ Captura segura: ${move.piece.tipo} captura ${move.capturedPiece.tipo} (+${capturedValue})`);
        }
        
        return netGain;
    }
    
    // Verificação adicional antes de qualquer captura
    isCaptureWorthIt(move, color, enemyColor) {
        const capturedValue = this.valueOfPiece(move.capturedPiece);
        const myPieceValue = this.valueOfPiece(move.piece);
        
        // Regra 1: NUNCA capturar peão (100) com rainha (900) em casa defendida
        if (myPieceValue > capturedValue + 200) {
            let isDefended = false;
            this.simulateMove(move, () => {
                const attackers = this.getAttackersOnSquare(move.to, enemyColor);
                isDefended = attackers.length > 0;
            });
            
            if (isDefended) {
                console.log(`🚫 BLOQUEIO: ${move.piece.tipo} (${myPieceValue}) não deve capturar ${move.capturedPiece.tipo} (${capturedValue}) - casa defendida`);
                return false;
            }
        }
        
        // Regra 2: Avaliar troca completa
        const see = this.staticExchangeEvaluation(move, color, enemyColor);
        if (see < 0) {
            console.log(`🚫 BLOQUEIO: captura resulta em perda líquida de ${-see}`);
            return false;
        }
        
        return true;
    }

    // ============ DESENVOLVIMENTO E ESTRATÉGIA ============
    
    isEarlyGame() {
        let piecesInStartPosition = 0;
        const backRanks = [0, 1, 6, 7];
        
        for (const rank of backRanks) {
            for (let file = 0; file < 8; file++) {
                const idx = rank * 8 + file;
                const piece = this.board.board[idx];
                if (piece && (piece.tipo.includes("♘") || piece.tipo.includes("♗") || 
                              piece.tipo.includes("♞") || piece.tipo.includes("♝"))) {
                    piecesInStartPosition++;
                }
            }
        }
        
        return piecesInStartPosition >= 4;
    }

    findDevelopmentMoves(moves, color) {
        return moves.filter(move => {
            const fromRank = Math.floor(move.from / 8);
            const toRank = Math.floor(move.to / 8);
            
            const isPieceInBackRank = (color === "brancas" && fromRank === 7) ||
                                     (color === "pretas" && fromRank === 0);
            
            const movesToCenter = this.isCentralSquare(move.to);
            
            const isDevelopingPiece = move.piece.tipo.includes("♘") || 
                                     move.piece.tipo.includes("♗") ||
                                     move.piece.tipo.includes("♞") || 
                                     move.piece.tipo.includes("♝");
            
            return (isPieceInBackRank || movesToCenter) && isDevelopingPiece;
        });
    }

    // ============ FUNÇÕES AUXILIARES MELHORADAS ============
    
    getPositionalValue(index, piece, color) {
        const adjustedIndex = color === "pretas" ? 63 - index : index;
        
        if (piece.tipo.includes("♙") || piece.tipo.includes("♟")) {
            return this.pawnTable[adjustedIndex];
        }
        if (piece.tipo.includes("♘") || piece.tipo.includes("♞")) {
            return this.knightTable[adjustedIndex];
        }
        if (piece.tipo.includes("♗") || piece.tipo.includes("♝")) {
            return this.bishopTable[adjustedIndex];
        }
        if (piece.tipo.includes("♔") || piece.tipo.includes("♚")) {
            return this.kingMiddleGame[adjustedIndex];
        }
        
        return 0;
    }

    isCentralSquare(index) {
        const file = index % 8;
        const rank = Math.floor(index / 8);
        return file >= 2 && file <= 5 && rank >= 2 && rank <= 5;
    }

    calculateMobilityBonus(move, color) {
        let mobility = 0;
        this.simulateMove(move, () => {
            const possibleMoves = this.validator.getPossibleMoves(move.to) || [];
            mobility = possibleMoves.length;
        });
        return mobility;
    }

    protectsAlly(move, color) {
        let protects = false;
        this.simulateMove(move, () => {
            const attacks = this.getAttacksFromSquare(move.to, move.piece);
            protects = attacks.some(target => {
                const piece = this.board.board[target];
                return piece && piece.cor === color;
            });
        });
        return protects;
    }

    calculateThreatenedValue(move, enemyColor) {
        let totalValue = 0;
        this.simulateMove(move, () => {
            const attacks = this.getAttacksFromSquare(move.to, move.piece);
            attacks.forEach(target => {
                const piece = this.board.board[target];
                if (piece && piece.cor === enemyColor) {
                    totalValue += this.valueOfPiece(piece);
                }
            });
        });
        return totalValue;
    }

    getAttacksFromSquare(square, piece) {
        return this.validator.getPossibleMoves(square) || [];
    }

    getAttackersOnSquare(square, color) {
        const attackers = [];
        for (let i = 0; i < 64; i++) {
            const piece = this.board.board[i];
            if (!piece || piece.cor !== color) continue;
            
            const moves = this.validator.getPossibleMoves(i) || [];
            if (moves.includes(square)) {
                attackers.push({ index: i, piece });
            }
        }
        return attackers;
    }

    givesCheck(move, enemyColor) {
        let inCheck = false;
        this.simulateMove(move, () => {
            inCheck = this.validator.isKingInCheck(enemyColor);
        });
        return inCheck;
    }

    findBestCheckEscape(moves, color, enemyColor) {
        const escapeMoves = moves.filter(m => {
            let escapesCheck = false;
            this.simulateMove(m, () => {
                escapesCheck = !this.validator.isKingInCheck(color);
            });
            return escapesCheck;
        });
        
        if (escapeMoves.length === 0) return null;
        
        return this.evaluateAndChooseBest(escapeMoves, color, enemyColor).move;
    }

    findSafeEscapeMoves(moves, threatened, enemyColor) {
        return moves.filter(m => 
            threatened.some(t => t.index === m.from) && 
            !this.wouldBeAttackedAfterMove(m, enemyColor)
        );
    }

    filterRepeatingMoves(moves) {
        if (!this.lastMove) return moves;
        
        return moves.filter(m => {
            const isReverse = m.from === this.lastMove.to && m.to === this.lastMove.from;
            if (!isReverse) return true;
            
            return m.capturedPiece || this.willRemoveCheck(m);
        });
    }

    // ============ FUNÇÕES HERDADAS (mantidas) ============
    
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

    valueOfPiece(piece) {
        if (!piece) return 0;
        return this.pieceValueBySymbol[piece.tipo] || 100;
    }

    wouldBeAttackedAfterMove(move, enemyColor) {
        let attacked = false;
        this.simulateMove(move, () => {
            const enemyMoves = this.getAllMovesForColor(enemyColor);
            attacked = enemyMoves.some(em => em.to === move.to);
        });
        return attacked;
    }

    estimatedAttackerValueOnSquareAfterMove(move, enemyColor) {
        let minVal = Infinity;
        this.simulateMove(move, () => {
            const attackers = this.getAttackersOnSquare(move.to, enemyColor);
            for (const a of attackers) {
                const val = this.valueOfPiece(a.piece);
                if (val < minVal) minVal = val;
            }
        });
        return minVal === Infinity ? 0 : minVal;
    }

    getThreatenedPieces(color) {
        const threatened = [];
        const enemyColor = color === "brancas" ? "pretas" : "brancas";
        const enemyMoves = this.getAllMovesForColor(enemyColor);
        
        for (let i = 0; i < 64; i++) {
            const piece = this.board.board[i];
            if (!piece || piece.cor !== color) continue;
            
            if (enemyMoves.some(m => m.to === i)) {
                threatened.push({ index: i, piece });
            }
        }
        return threatened;
    }

    willRemoveCheck(move) {
        let removed = false;
        const color = this.board.board[move.from]?.cor;
        if (!color) return false;
        
        this.simulateMove(move, () => {
            removed = !this.validator.isKingInCheck(color);
        });
        return removed;
    }

    simulateMove(move, callback) {
        const from = move.from;
        const to = move.to;
        const originalFromPiece = this.board.board[from];
        const originalToPiece = this.board.board[to];
        
        this.board.board[to] = originalFromPiece;
        this.board.board[from] = null;
        
        try {
            callback();
        } finally {
            this.board.board[from] = originalFromPiece;
            this.board.board[to] = originalToPiece;
        }
    }

    applyMoveWithEPAndRegister(move) {
        if (!move) return;
        
        const piece = this.board.board[move.from];
        let epCapturedPos = null;
        
        try {
            if (this.enPassant?.isEnPassantMove) {
                epCapturedPos = this.enPassant.isEnPassantMove(move.from, move.to, piece);
            }
        } catch (e) {
            epCapturedPos = null;
        }
        
        try {
            if (epCapturedPos !== null && epCapturedPos !== undefined) {
                this.board.movePiece(move.from, move.to, epCapturedPos);
            } else {
                this.board.movePiece(move.from, move.to);
            }
        } catch (e) {
            this.board.board[move.to] = this.board.board[move.from];
            this.board.board[move.from] = null;
        }
        
        try {
            if (this.enPassant?.registerDoubleStep) {
                this.enPassant.registerDoubleStep(move.from, move.to, piece);
            }
        } catch (e) {}
    }

    indexToNotation(i) {
        const files = "abcdefgh";
        return `${files[i % 8]}${8 - Math.floor(i / 8)}`;
    }
}
