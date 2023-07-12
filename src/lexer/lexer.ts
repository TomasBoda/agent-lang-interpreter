import { Error } from "../lib/error";
import { Token, TokenType } from "./lexer.types";

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
    private source: string[] = [];
    private tokens: Token[] = [];

    constructor(sourceCode: string) {
        this.sourceCode = sourceCode;
    }

    public tokenize(): Token[] {
        this.source = this.sourceCode.split("");
        this.tokens = [];

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
            } else if (this.isNext("=")) {
                this.token(TokenType.Equals);
            } else if (this.isNext(",")) {
                this.token(TokenType.Comma);
            } else if (this.isNext(".")) {
                this.token(TokenType.Dot);
            } else if (this.isNext(":")) {
                this.token(TokenType.Colon);
            } else if (this.isNext(";")) {
                this.token(TokenType.Semicolon);
            } else {
                if (this.isNumber()) {
                    let number = "";
                    let foundDot = false;

                    while (this.hasNext() && (this.isNumber() || (this.isNext(".")))) {
                        if (this.isNext(".")) {
                            if (foundDot) {
                                Error.lex("Number cannot contain more than one dot");
                            }

                            foundDot = true;
                        }

                        number += this.next();
                    }

                    this.token(TokenType.Number, number);
                } else if (this.isAlpha()) {
                    let identifier = "";

                    while (this.hasNext() && this.isAlpha()) {
                        identifier += this.next();
                    }

                    this.token(this.getIdentifierTokenType(identifier), identifier);
                } else if (this.isSkippable()) {
                    this.next();
                } else {
                    Error.lex("Unrecognized character found in source: " + this.getNext());
                }
            }
        }

        return this.tokens;
    }

    private getIdentifierTokenType(identifier: string): TokenType {
        const keyword = ReservedKeywords[identifier];
        return keyword !== undefined ? keyword : TokenType.Identifier;
    }

    private hasNext(): boolean {
        return this.source.length > 0;
    }

    private getNext(): string {
        return this.source[0];
    }

    private isNext(symbol: string): boolean {
        return symbol === this.getNext();
    }

    private next(): string {
        return this.source.shift() ?? "";
    }

    private token(type: TokenType, value = this.next()): void {
        this.tokens.push({ type, value });
    }

    private isAlpha(): boolean {
        return this.getNext().toUpperCase() != this.getNext().toLowerCase();
    }

    private isNumber(): boolean {
        const symbol = this.getNext().charCodeAt(0);
        const bounds = { lower: "0".charCodeAt(0), upper: "9".charCodeAt(0) };
        return symbol >= bounds.lower && symbol <= bounds.upper;
    }

    private isSkippable(): boolean {
        return this.getNext() === " " || this.getNext() === "\n" || this.getNext() === "\t";
    }
}