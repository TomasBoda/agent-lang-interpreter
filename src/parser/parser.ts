import { Position, Token, TokenType } from "../lexer/lexer.types";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, Expression, Identifier, LogicalExpression, NodeType, NumericLiteral, ObjectDeclaration, Program, Statement, VariableDeclaration, VariableType } from "./parser.types";
import { Error } from "../utils/error";

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
                Error.parse(this.at().position, "Only object declarations are allowed in program scope, " + this.at().type + " was provided");
                return {} as Statement;
        }
    }

    private parseObjectDeclaration(): Statement {
        const position = this.next().position;
        const identifier = this.expect(TokenType.Identifier, "Expected identifier after AGENT declaration").value;
        const count = this.expect(TokenType.Number, "Expected number of agents after identifier").value;
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
                    Error.parse(this.at().position, "Only variable declarations are allowed in agent scope, " + this.at().type + " was provided");
            }
        }

        this.expect(TokenType.CloseBrace, "Expected a close brace after AGENT declaration");

        return { type: NodeType.ObjectDeclaration, identifier, count: parseFloat(count), body, position } as ObjectDeclaration;
    }

    private parseVariableDeclaration(): Statement {
        const position = this.at().position;

        const variableType = this.next().type;
        const identifier: string = this.expect(TokenType.Identifier, "Expected an identifier in variable declaration").value;
        let defaultValue: Expression | undefined;

        if (variableType === TokenType.Variable) {
            this.expect(TokenType.Colon, "Expected a colon for default value in variable declaration");
            defaultValue = this.parseExpression();
        }

        this.expect(TokenType.Equals, "Expected equals sign after default value expression in variable declaration");
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

        return { type: NodeType.VariableDeclaration, variableType: getVariableType(), identifier, default: defaultValue, value, position } as VariableDeclaration;
    }

    private parseExpression(): Expression {
        return this.parseConditionalExpression();
    }

    private parseConditionalExpression(): Expression {
        if (this.at().type === TokenType.If) {
            const position = this.next().position;
            const condition = this.parseExpression();
            this.expect(TokenType.Then, "Expected THEN keyword after IF");
            const consequent = this.parseExpression();
            this.expect(TokenType.Else, "Expected ELSE keyword after THEN");
            const alternate = this.parseExpression();

            return { type: NodeType.ConditionalExpression, condition, consequent, alternate, position } as ConditionalExpression;
        }

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
        let left: Expression = this.parseCallExpression();

        while (this.at().value === "*" || this.at().value === "/" || this.at().value === "%") {
            const position: Position = this.at().position;
            const operator = this.next().value;
            const right = this.parseCallExpression();
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

    private parseCallExpression(): Expression {
        const caller = this.parsePrimaryExpression();

        if (this.at().type === TokenType.OpenParen) {
            return {
                type: NodeType.CallExpression,
                caller,
                args: this.parseArguments()
            } as CallExpression;
        }

        return caller;
    }

    private parseArguments(): Expression[] {
        this.expect(TokenType.OpenParen, "Expected an open parenthesis before function arguments");
        const args: Expression[] = this.at().type === TokenType.CloseParen ? [] : this.parseArgumentsList();
        this.expect(TokenType.CloseParen, "Expected a closing parenthesis after function arguments");
        return args;
    }

    private parseArgumentsList(): Expression[] {
        const args = [ this.parseExpression() ];

        while (this.at().type === TokenType.Comma && this.next()) {
            args.push(this.parseExpression());
        }

        return args;
    }

    private parsePrimaryExpression(): Expression {
        const token = this.at();

        switch (token.type) {
            case TokenType.Identifier:
                return { type: NodeType.Identifier, position: this.at().position, identifier: this.next().value } as Identifier;
            
            case TokenType.Number:
                return { type: NodeType.NumericLiteral, position: this.at().position, value: parseFloat(this.next().value) } as NumericLiteral;
            
            // parse negative numbers
            case TokenType.BinaryOperator:
                if (token.value === "-") {
                    if (this.getNext().type !== TokenType.Number) {
                        Error.parse(token.position, "Negative sign must preceed a number, provided a non-number value");
                    }

                    return { type: NodeType.NumericLiteral, position: this.at().position, value: parseFloat(this.next().value + this.next().value) } as NumericLiteral
                }

            case TokenType.Boolean:
                return { type: NodeType.BooleanLiteral, position: this.at().position, value: this.next().value === "TRUE" ? true : false } as BooleanLiteral;

            case TokenType.OpenParen:
                this.next();
                const value: Expression = this.parseExpression();
                this.expect(TokenType.CloseParen, "Expected a closing parenthesis");
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

    private getNext(): Token {
        if (this.tokens.length <= 2) {
            Error.parse(null, "Cannot get next token because EOF");
        }

        return this.tokens[1];
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