// AI_Easy.js - v1
class AI_Easy {
    constructor(board, validator, enPassant) {
        this.board = board;
        this.validator = validator;
        this.enPassant = enPassant;
    }
    makeMove(color) {
        const moves = this.getAllMoves(color);
        if (moves.length === 0) return null;
        // Fácil = totalmente aleatório
        return moves[Math.floor(Math.random() * moves.length)];
    }
    getAllMoves(color) {
        const results = [];
        for (let i = 0; i < 64; i++) {
            const piece = this.board.board[i];
            if (!piece || piece.cor !== color) continue;
            const legalMoves = this.validator.getPossibleMoves(i);
            for (let dest of legalMoves)
                results.push({ from: i, to: dest });
        }
        return results;
    }
}
export { AI_Easy };