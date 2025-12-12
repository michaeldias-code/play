// Piece.js - v1
import { Classes } from './config.js';
export class Piece {
    constructor(tipo, cor) {
        this.tipo = tipo; // '♙', '♟', '♖', '♜', etc.
        this.cor = cor;   // 'brancas' ou 'pretas'
    }
    isWhite() {
        return this.cor === 'brancas';
    }
    isBlack() {
        return this.cor === 'pretas';
    }
    getType() {
        return this.tipo;
    }
    getColor() {
        return this.cor;
    }
    // Retorna possíveis movimentos relativos (offsets) para cada tipo
    getMoveOffsets() {
        switch (this.tipo) {
            case '♙': return [-8, -16, -7, -9];   // Peão branco (avanço, captura)
            case '♟': return [8, 16, 7, 9];       // Peão preto
            case '♖':
            case '♜': return [-1, 1, -8, 8];      // Torre
            case '♞':
            case '♘': return [-17,-15,-10,-6,6,10,15,17]; // Cavalo
            case '♝':
            case '♗': return [-9,-7,7,9];         // Bispo
            case '♕':
            case '♛': return [-1,1,-8,8,-9,-7,7,9]; // Rainha
            case '♔':
            case '♚': return [-9,-8,-7,-1,1,7,8,9]; // Rei
            default: return [];
        }
    }
    // Indica se a peça é deslizante (torre, bispo, rainha) ou não
    isSliding() {
        return ['♖','♜','♝','♗','♕','♛'].includes(this.tipo);
    }
}
console.log('Piece module carregado!');