import { Error } from "../lib/error";
import { Position, Symbol, Token, TokenType } from "./lexer.types";

export const ReservedKeywords: Record<string, TokenType> = {
    "AGENT": TokenType.Agent,

    "VARIABLE": TokenType.Variable,
    "CONST": TokenType.Const,
    "DYNAMIC": TokenType.Dynamic,
    
    "IF": TokenType.If,
    "THEN": TokenType.Then,
    "ELSE": TokenType.Else,
    "AND": TokenType.And,
    "OR": TokenType.Or,
    "AS": TokenType.As
}

export class Lexer {

    private sourceCode: string;

    private symbols: Symbol[] = [];
    private tokens: Token[] = [];

    constructor(sourceCode: string) {
        this.sourceCode = sourceCode;
    }

    public tokenize(): Token[] {
        this.symbols = [];
        this.tokens = [];

        this.generateSourceCodeSymbols();

        while (this.hasNext()) {
            if (this.isNext("(")) {
                this.token(TokenType.OpenParen);
            } else if (this.isNext(")")) {
                this.token(TokenType.CloseParen);
            } else if (this.isNext("{")) {
                this.token(TokenType.OpenBrace);
            } else if (this.isNext("}")) {
                this.token(TokenType.CloseBrace);
            } else if (this.isNext("+")) {
                this.token(TokenType.BinaryOperator);
            } else if (this.isNext("-")) {
                this.token(TokenType.BinaryOperator);
            } else if (this.isNext("*")) {
                this.token(TokenType.BinaryOperator);
            } else if (this.isNext("/")) {
                this.token(TokenType.BinaryOperator);
            } else if (this.isNext("%")) {
                this.token(TokenType.BinaryOperator);
            } else if (this.isNext(">") || this.isNext("<") || this.isNext("=")) {
                const position = this.getNext().position;
                let operator = this.next().value;

                if (this.getNext().value === "=") {
                    operator += this.next().value;
                }

                this.token(TokenType.BinaryOperator, { value: operator, position });
            } else if (this.isNext(",")) {
                this.token(TokenType.Comma);
            } else if (this.isNext(".")) {
                this.token(TokenType.Dot);
            } else if (this.isNext(":")) {
                this.token(TokenType.Colon);
            } else if (this.isNext(";")) {
                this.token(TokenType.Semicolon);
            } else {
                const position: Position = this.getNext().position;

                // decimal numbers
                if (this.isNumber()) {
                    let number: string = "";
                    let foundDecimalPoint: boolean = false;

                    while (this.hasNext() && (this.isNumber() || (this.isNext(".")))) {
                        if (this.isNext(".")) {
                            if (foundDecimalPoint) {
                                Error.lex(position, "Number cannot contain more than one decimal point");
                            }

                            foundDecimalPoint = true;
                        }

                        number += this.next().value;
                    }

                    this.token(TokenType.Number, { value: number, position });
                // identifiers
                } else if (this.isAlpha()) {
                    let identifier: string = "";

                    while (this.hasNext() && this.isAlpha()) {
                        identifier += this.next().value;
                    }

                    this.token(this.getIdentifierTokenType(identifier), { value: identifier, position });
                } else if (this.isSkippable()) {
                    this.next();
                } else {
                    Error.lex(position, "Unrecognized character found in source: " + this.getNext().value);
                }
            }
        }

        this.generateEOFToken();
        return this.tokens;
    }

    private generateSourceCodeSymbols(): void {
        let lineNumber: number = 1;
        let charNumber: number = 1;

        for (const character of this.sourceCode.split("")) {
            this.symbol(character, lineNumber, charNumber);

            charNumber++;

            if (character === "\n") {
                lineNumber++;
                charNumber = 1;
            }
        }
    }

    private getIdentifierTokenType(identifier: string): TokenType {
        const keyword = ReservedKeywords[identifier];
        return keyword ? keyword : TokenType.Identifier;
    }

    private hasNext(): boolean {
        return this.symbols.length > 0;
    }

    private getNext(): Symbol {
        return this.symbols[0];
    }

    private isNext(symbol: string): boolean {
        return symbol === this.getNext().value;
    }

    private next(): Symbol {
        return this.symbols.shift() ?? {} as Symbol;
    }

    private token(type: TokenType, symbol = this.next()): void {
        this.tokens.push({ type, value: symbol.value, position: symbol.position });
    }

    private symbol(value: string, line: number, character: number): void {
        this.symbols.push({ value, position: { line, character } });
    }

    private generateEOFToken(): void {
        if (this.tokens.length === 0) {
            this.token(TokenType.EOF, { value: "EOF", position: { line: 1, character: 1 } });
            return;
        }

        const lastPosition: Position = this.tokens[this.tokens.length - 1].position;
        const eofPosition: Position = { ...lastPosition, character: lastPosition.character + 1 };

        this.token(TokenType.EOF, { value: "EOF", position: eofPosition });
    }

    private isAlpha(): boolean {
        return this.getNext().value.toUpperCase() != this.getNext().value.toLowerCase();
    }

    private isNumber(): boolean {
        const symbol: number = this.getNext().value.charCodeAt(0);
        const bounds = { lower: "0".charCodeAt(0), upper: "9".charCodeAt(0) };
        return symbol >= bounds.lower && symbol <= bounds.upper;
    }

    private isSkippable(): boolean {
        return this.getNext().value === " " || this.getNext().value === "\n" || this.getNext().value === "\t";
    }
}