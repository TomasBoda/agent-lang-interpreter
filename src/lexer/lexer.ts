import { Token, TokenType } from "./model/index.ts";
import { Symbol, Position } from "../symbolizer/index.ts";
import { ReservedKeywords } from "./keywords.ts";
import { ErrorLexer } from "../utils/index.ts";

export class Lexer {

    private symbols: Symbol[];
    private tokens: Token[] = [];

    constructor(symbols: Symbol[]) {
        this.symbols = symbols;
    }

    /**
     * Produces an array of tokens from array of symbols
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
                case "*":
                case "/":
                case "%":
                    this.token(TokenType.BinaryOperator);
                    break;
                case "-": {
                    const operator = this.next();

                    if (this.isNext(">")) {
                        operator.value += this.next().value;
                        this.token(TokenType.Arrow, operator);
                        break;
                    }

                    this.token(TokenType.BinaryOperator, operator);
                    break;
                }
                case "|":
                    this.token(TokenType.Divider);
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
     * @param position position in source code
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

    /**
     * Checks if there are symbols left in the stream
     * 
     * @returns true if the stream has next symbols
     */
    private hasNext(): boolean {
        return this.symbols.length > 0;
    }

    /**
     * Returns the current symbol in the stream
     * 
     * @returns current symbol
     */
    private getNext(): Symbol {
        return this.symbols[0];
    }

    /**
     * Checks if the current symbol value equals the given value
     * 
     * @param character 
     * @returns true if the current symbol value equals the given value, otherwise false
     */
    private isNext(character: string): boolean {
        return character === this.getNext().value;
    }

    /**
     * Returns the current symbol and removes it from the stream
     * 
     * @throws lexer error if there is no symbol in the stream
     * @returns current symbol
     */
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
     * @param type token type
     * @param symbol token symbol (value and position)
     */
    private token(type: TokenType, symbol = this.next()): void {
        this.tokens.push({ type, value: symbol.value, position: symbol.position });
    }

    /**
     * Generates the EOF (end-of-file) token
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

    /**
     * Tries to retrieve a reserved keyword type by its identifier
     * 
     * @param identifier identifier to retrieve the reserved keyword type by
     * @returns reserved keyword if it was found, otherwise the plain identifier type
     */
    private getKeywordOrIdentifierTokenType(identifier: string): TokenType {
        const keyword = ReservedKeywords[identifier];
        return keyword ?? TokenType.Identifier;
    }

    /**
     * Checks whether the value of the current symbol is alpha
     * 
     * @returns true if the value of the current token is alpha, otherwise false
     */
    private isAlpha(): boolean {
        return this.getNext().value.toUpperCase() != this.getNext().value.toLowerCase();
    }

    /**
     * Checks whether the value of the current symbol is numeric
     * 
     * @returns true if the value of the current symbol is numeric, otherwise false
     */
    private isNumber(): boolean {
        const symbol = this.getNext().value.charCodeAt(0);
        const bounds = {
            lower: "0".charCodeAt(0),
            upper: "9".charCodeAt(0)
        };

        return symbol >= bounds.lower && symbol <= bounds.upper;
    }

    /**
     * Checks whether the value of the current symbol is skippable
     * 
     * @returns true if the value of the current token is skippable, otherwise false
     */
    private isSkippable(): boolean {
        return [ " ", "\n", "\t" ].includes(this.getNext().value);
    }
}