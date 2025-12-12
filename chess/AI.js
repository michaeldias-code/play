//AI.js - v1
import { AI_Easy } from "./AI_Easy.js?v=999";
import { AI_Medium } from "./AI_Medium.js?v=999";
import { AI_Hard } from "./AI_Hard.js?v=999";
export class AI {
    constructor(board, validator, enPassant, difficulty) {
        this.board = board;
        this.validator = validator;
        this.enPassant = enPassant;
        // ✔️ salvar dificuldade
        this.difficulty = difficulty;
        this.strategies = {
            easy: AI_Easy,
            medium: AI_Medium,
            hard: AI_Hard
        };
        // ✔️ aplicar estratégia inicial
        this.setDifficulty(this.difficulty);
    }
    setDifficulty(level) {
        this.difficulty = level; // ✔️ manter atualizado
        const Strategy = this.strategies[level] || this.strategies["easy"];
        this.current = new Strategy(this.board, this.validator, this.enPassant);
        console.log("🎯 AI Strategy =", level);
    }
    makeMove(color) {
        return this.current.makeMove(color); // delega para a IA filha
    }
}