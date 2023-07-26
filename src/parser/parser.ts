import { Token, TokenType } from "../lexer/lexer.types";
import {BinaryExpression, Expression, Identifier, NodeType, NumericLiteral, Program, Statement } from "./ast.types";
import { Error } from "../lib/error";

export class Parser {

    private tokens: Token[];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    // generates AST from tokens
    public parse(): Program {
        const program: Program = this.createEmptyProgram();

        while (this.notEndOfFile()) {
            program.body.push(this.parseStatement());
        }

        return program;
    }

    // parsing methods

    private parseStatement(): Statement {
        return this.parseExpression();
    }

    private parseExpression(): Expression {
        return this.parseAdditiveExpression();
    }

    private parseAdditiveExpression(): Expression {
        let left = this.parseMultiplicativeExpression();

        while (this.at().value === "+" || this.at().value === "-") {
            const operator = this.next().value;
            const right = this.parseMultiplicativeExpression();
            left = {
                type: NodeType.BinaryExpression,
                left,
                right,
                operator
            } as BinaryExpression;
        }

        return left;
    }

    private parseMultiplicativeExpression(): Expression {
        let left = this.parsePrimaryExpression();

        while (this.at().value === "*" || this.at().value === "/" || this.at().value === "%") {
            const operator = this.next().value;
            const right = this.parsePrimaryExpression();
            left = {
                type: NodeType.BinaryExpression,
                left,
                right,
                operator
            } as BinaryExpression;
        }

        return left;
    }

    private parsePrimaryExpression(): Expression {
        const token = this.at();

        switch (token.type) {
            case TokenType.Identifier:
                return { type: NodeType.Identifier, identifier: this.next().value } as Identifier;
            case TokenType.Number:
                return { type: NodeType.NumericLiteral, value: parseFloat(this.next().value) } as NumericLiteral;
            case TokenType.OpenParen:
                // skip the open parenthesis
                this.next();
                const value = this.parseExpression();
                // skip the close parenthesis
                this.expect(TokenType.CloseParen, "Expected a closing parenthesis, not found!");
                return value;
            default:
                Error.parse(this.at().position, "Unexpected token found during parsing: " + this.at().value)
                return {} as Statement;
        }
    }

    private at(): Token {
        return this.tokens[0];
    }

    private next(): Token {
        const previous: Token = this.tokens.shift() as Token;
        return previous;
    }

    private expect(type: TokenType, message: string): Token {
        const previous: Token = this.next();

        if (!previous || previous.type !== type) {
            Error.parse(previous.position, message);
        }

        return previous;
    }

    private notEndOfFile() {
        return this.tokens[0].type !== TokenType.EOF;
    }

    private createEmptyProgram(): Program {
        return { type: NodeType.Program, body: [] };
    }
}