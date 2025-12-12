// EnPassant.js -v1
export class EnPassant {
    constructor() {
        this.targetPos = null;
    }
    resetTarget() {
        this.targetPos = null;
    }
    setTarget(pos) {
        this.targetPos = pos;
    }
    getEnPassantTargetsForPawn(pawnPos) {
        if (this.targetPos === null) return [];
        const pawnRow = Math.floor(pawnPos / 8);
        const targetRow = Math.floor(this.targetPos / 8);
        const pawnCol = pawnPos % 8;
        const targetCol = this.targetPos % 8;
        // LOG DE DEPURAÇÃO
        //console.log(`[EP Check] Peão em ${pawnPos} (R${pawnRow}, C${pawnCol}) tentando alvo ${this.targetPos} (R${targetRow}, C${targetCol})`);
        // 1. Checagem de Coluna (Devem ser adjacentes)
        if (Math.abs(pawnCol - targetCol) !== 1) {
            //console.log(`[EP Falhou] Colunas não são adjacentes. Distância: ${Math.abs(pawnCol - targetCol)}`);
            return [];
        }
        // 2. Checagem de Linha (Regra Oficial: o atacante deve estar na 5ª ou 4ª fileira)
        // Brancas atacam da linha de índice 3 para 2.
        // Pretas atacam da linha de índice 4 para 5.
        // Se for Peão Branco (sobe o tabuleiro)
        if (targetRow < pawnRow) {
            if (pawnRow !== 3) {
                //console.log(`[EP Falhou] Peão branco na linha ${pawnRow}. Precisa estar na linha 3 (5ª fileira)`);
                return [];
            }
        } 
        // Se for Peão Preto (desce o tabuleiro)
        else {
            if (pawnRow !== 4) {
                //console.log(`[EP Falhou] Peão preto na linha ${pawnRow}. Precisa estar na linha 4 (4ª fileira)`);
                return [];
            }
        }
        //console.log(`[EP Sucesso] Alvo legal detectado em ${this.targetPos}`);
        return [this.targetPos];
    }
    isEnPassantMove(from, to, piece) {
        if (piece.tipo !== '♙' && piece.tipo !== '♟') return null;
        const targets = this.getEnPassantTargetsForPawn(from);
        if (!targets.includes(to)) return null;
        return piece.tipo === '♙' ? to + 8 : to - 8;
    }
}