import { Token, TokenType } from "./model";
import { Symbol, Position } from "../symbolizer";
import { ReservedKeywords } from "./keywords";
import { ErrorLexer } from "../utils";

export class Lexer {

    private symbols: Symbol[];
    private tokens: Token[] = [];

    constructor(symbols: Symbol[]) {
        this.symbols = symbols;
    }

    /**
     * Produces an array of tokens from source code
     * 
     * @returns array of tokens
     */
    public tokenize(): Token[] {
        this.tokens = [];

        while (this.hasNext()) {
            switch (this.getNext().value) {
                case "#": {
                    this.next();

                    while (this.getNext().value !== '#') {
                        this.next();
                    }

                    this.next();
                    
                    break;
                }
                case "(":
                    this.token(TokenType.OpenParen);
                    break;
                case ")":
                    this.token(TokenType.CloseParen);
                    break;
                case "{":
                    this.token(TokenType.OpenBrace);
                    break;
                case "}":
                    this.token(TokenType.CloseBrace);
                    break;
                case ".":
                    this.token(TokenType.Dot);
                    break;
                case ",":
                    this.token(TokenType.Comma);
                    break;
                case ":":
                    this.token(TokenType.Colon);
                    break;
                case ";":
                    this.token(TokenType.Semicolon);
                    break;
                case "+":
                case "-":
                case "*":
                case "/":
                case "%":
                    this.token(TokenType.BinaryOperator);
                    break;
                case "<":
                case ">": {
                    const operator = this.next();

                    if (this.isNext("=")) {
                        operator.value += this.next().value;
                    }

                    this.token(TokenType.RelationalOperator, operator);
                    break;
                }
                case "=": {
                    const operator = this.next();
    
                    if (this.isNext(">")) {
                        operator.value += this.next().value;
                        this.token(TokenType.LambdaArrow, operator);
                        break;
                    }
    
                    if (this.isNext("=")) {
                        operator.value += this.next().value;
                        this.token(TokenType.RelationalOperator, operator);
                        break;
                    }

                    this.token(TokenType.AssignmentOperator, operator);
                    break;
                }
                case "!": {
                    const operator = this.next();

                    if (this.isNext("=")) {
                        operator.value += this.next().value;
                        this.token(TokenType.RelationalOperator, operator);
                        break;
                    }
                    
                    this.token(TokenType.UnaryOperator, operator);
                    break;
                }
                default: {
                    const { position } = this.getNext();
    
                    if (this.isNumber()) {
                        this.tokenizeNumber(position);
                        break;
                    }
    
                    if (this.isAlpha()) {
                        this.tokenizeIdentifierOrKeyword(position);
                        break;
                    }
    
                    if (this.isSkippable()) {
                        this.next();
                        break;
                    }
    
                    throw new ErrorLexer(`Unrecognized character found in source: ${this.getNext().value}`, this.getNext().position);
                }
            }
        }

        this.generateEOFToken();

        return this.tokens;
    }

    /**
     * Produces a numeric literal token
     * 
     * @param position - position in source code
     */
    private tokenizeNumber(position: Position): void {
        let number = "";
        let foundDecimalPoint = false;

        while (this.hasNext() && (this.isNumber() || this.isNext("."))) {
            if (this.isNext(".")) {
                if (foundDecimalPoint) {
                    throw new ErrorLexer("Number cannot contain more than one decimal point", position);
                }

                foundDecimalPoint = true;
            }

            number += this.next().value;
        }

        this.token(TokenType.Number, { value: number, position });
    }

    /**
     * Produces an identifier or keyword token
     * 
     * @param position - position in source code
     */
    private tokenizeIdentifierOrKeyword(position: Position): void {
        let identifier = "";
    
        while (this.hasNext() && (this.isAlpha() || this.getNext().value === "_")) {
            identifier += this.next().value;
        }

        this.token(this.getKeywordOrIdentifierTokenType(identifier), { value: identifier, position });
    }

    private hasNext(): boolean {
        return this.symbols.length > 0;
    }

    private getNext(): Symbol {
        return this.symbols[0];
    }

    private isNext(character: string): boolean {
        return character === this.getNext().value;
    }

    private next(): Symbol {
        const symbol = this.symbols.shift();

        if (!symbol) {
            throw new ErrorLexer("Cannot retrieve next token, since it does not exist");
        }

        return symbol;
    }

    /**
     * Generates a new token with specified type, value and position
     * 
     * @param type - token type
     * @param symbol - token symbol (value and position)
     */
    private token(type: TokenType, symbol = this.next()): void {
        this.tokens.push({ type, value: symbol.value, position: symbol.position });
    }

    /**
     * Generates the end-of-file (EOF) token
     */
    private generateEOFToken(): void {
        if (this.tokens.length === 0) {
            this.token(TokenType.EOF, {
                value: "EOF",
                position: { line: 1, character: 1 }
            });
            return;
        }

        const lastPosition: Position = this.tokens[this.tokens.length - 1].position;
        const eofPosition: Position = {
            ...lastPosition,
            character: lastPosition.character + 1
        };

        this.token(TokenType.EOF, {
            value: "EOF",
            position: eofPosition
        });
    }

    private getKeywordOrIdentifierTokenType(identifier: string): TokenType {
        const keyword = ReservedKeywords[identifier];
        return keyword ?? TokenType.Identifier;
    }

    private isAlpha(): boolean {
        return this.getNext().value.toUpperCase() != this.getNext().value.toLowerCase();
    }

    private isNumber(): boolean {
        const symbol = this.getNext().value.charCodeAt(0);
        const bounds = {
            lower: "0".charCodeAt(0),
            upper: "9".charCodeAt(0)
        };

        return symbol >= bounds.lower && symbol <= bounds.upper;
    }

    private isSkippable(): boolean {
        return [ " ", "\n", "\t" ].includes(this.getNext().value);
    }
}