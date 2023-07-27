import { Position, Token, TokenType } from "../lexer/lexer.types";
import {BinaryExpression, Expression, Identifier, LogicalExpression, NodeType, NumericLiteral, ObjectDeclaration, Program, Statement, VariableDeclaration, VariableType } from "./ast.types";
import { Error } from "../lib/error";

export class Parser {

    private tokens: Token[];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public parse(): Program {
        const program: Program = this.createEmptyProgram();

        while (this.notEndOfFile()) {
            program.body.push(this.parseStatement());
        }

        return program;
    }

    private parseStatement(): Statement {
        switch (this.at().type) {
            case TokenType.Agent:
                return this.parseObjectDeclaration();
            default:
                return this.parseExpression();
        }
    }

    private parseObjectDeclaration(): Statement {
        const position = this.next().position;
        const identifier = this.expect(TokenType.Identifier, "Expected identifier after AGENT declaration").value;
        this.expect(TokenType.OpenBrace, "Expected open brace after AGENT declaration");
        const body: VariableDeclaration[] = [];

        while (this.at().type !== TokenType.CloseBrace) {
            switch (this.at().type) {
                case TokenType.Variable:
                case TokenType.Const:
                case TokenType.Dynamic:
                    const declaration: Statement = this.parseVariableDeclaration();
                    body.push(declaration as VariableDeclaration);
                    break;
                default:
                    Error.parse(this.at().position, "Expected VARIABLE, CONST or DYNAMIC keywords");
            }
        }

        this.expect(TokenType.CloseBrace, "Expected a close brace after AGENT declaration");

        const objectDeclaration: ObjectDeclaration = {
            type: NodeType.ObjectDeclaration,
            identifier,
            body,
            position
        };

        return objectDeclaration;
    }

    private parseVariableDeclaration(): Statement {
        const position = this.at().position;

        const variableType = this.next().type;
        const identifier: string = this.expect(TokenType.Identifier, "Expected identifier in variable declaration").value;
        let defaultValue: Expression | undefined;

        if (variableType === TokenType.Variable) {
            this.expect(TokenType.Colon, "Expected a colon for default value in VARIABLE declaration");
            defaultValue = this.parseExpression();
        }

        this.expect(TokenType.Equals, "Expected equals sign after default value expression in VARIABLE declaration");
        const value: Expression = this.parseExpression();
        this.expect(TokenType.Semicolon, "Expected semicolon after variable declaration");

        function getVariableType() {
            if (variableType === TokenType.Variable) {
                return VariableType.Variable;
            } else if (variableType === TokenType.Const) {
                return VariableType.Const;
            } else {
                return VariableType.Dynamic;
            }
        }

        const variableDeclaration: VariableDeclaration = {
            type: NodeType.VariableDeclaration,
            variableType: getVariableType(),
            identifier,
            default: defaultValue,
            value,
            position
        };

        return variableDeclaration;
    }

    private parseExpression(): Expression {
        return this.parseLogicalExpression();
    }

    private parseLogicalExpression(): Expression {
        let left: Expression = this.parseComparisonExpression();

        while (this.at().type === TokenType.And || this.at().type === TokenType.Or) {
            const position: Position = this.at().position;
            const operator = this.next().value;
            const right = this.parseComparisonExpression();
            left = {
                type: NodeType.LogicalExpression,
                left,
                right,
                operator,
                position
            } as LogicalExpression;
        }

        return left;
    }

    private parseComparisonExpression(): Expression {
        let left: Expression = this.parseAdditiveExpression();

        while (this.at().value === "==" || this.at().value === ">" || this.at().value === ">=" || this.at().value === "<" || this.at().value === "<=") {
            const position: Position = this.at().position;
            const operator = this.next().value;
            const right = this.parseAdditiveExpression();
            left = {
                type: NodeType.BinaryExpression,
                left,
                right,
                operator,
                position
            } as BinaryExpression;
        }

        return left;
    }

    private parseAdditiveExpression(): Expression {
        let left = this.parseMultiplicativeExpression();

        while (this.at().value === "+" || this.at().value === "-") {
            const position: Position = this.at().position;
            const operator = this.next().value;
            const right = this.parseMultiplicativeExpression();
            left = {
                type: NodeType.BinaryExpression,
                left,
                right,
                operator,
                position
            } as BinaryExpression;
        }

        return left;
    }

    private parseMultiplicativeExpression(): Expression {
        let left: Expression = this.parsePrimaryExpression();

        while (this.at().value === "*" || this.at().value === "/" || this.at().value === "%") {
            const position: Position = this.at().position;
            const operator = this.next().value;
            const right = this.parsePrimaryExpression();
            left = {
                type: NodeType.BinaryExpression,
                left,
                right,
                operator,
                position
            } as BinaryExpression;
        }

        return left;
    }

    private parsePrimaryExpression(): Expression {
        const token = this.at();

        switch (token.type) {
            case TokenType.Identifier:
                return { type: NodeType.Identifier, position: this.at().position, identifier: this.next().value } as Identifier;
            
            case TokenType.Number:
                return { type: NodeType.NumericLiteral, position: this.at().position, value: parseFloat(this.next().value) } as NumericLiteral;
            
            case TokenType.OpenParen:
                this.next();
                const value: Expression = this.parseExpression();
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
        return { type: NodeType.Program, body: [], position: { line: 1, character: 1 } };
    }
}