import { Position } from "../symbolizer";
import { Token, TokenType } from "../lexer";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, DefineDeclaration, Expression, Identifier, LambdaExpression, LogicalExpression, MemberExpression, NodeType, NumericLiteral, ObjectDeclaration, OtherwiseExpression, ParserValue, Program, Statement, UnaryExpression, VariableDeclaration, VariableType } from "./model";
import { getProgram } from "./topology";
import { ErrorParser } from "../utils";

export class Parser {

    private readonly tokens: Token[];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public parse(): Program {
        const program: Program = this.createEmptyProgram();

        while (this.notEndOfFile()) {
            const statement: ParserValue = this.parseStatement();
            program.body.push(statement as Statement);
        }

        return getProgram(program);
    }

    private parseStatement(): Statement {
        switch (this.at().type) {
            case TokenType.Agent:
                return this.parseObjectDeclaration();
            case TokenType.Define:
                return this.parseDefineDeclaration();
            default:
                throw new ErrorParser("Only agent and define declarations are allowed in program scope", this.position());
        }
    }

    private parseDefineDeclaration(): DefineDeclaration {
        if (this.isNotOf(TokenType.Define)) {
            throw new ErrorParser("Expected define keyword in program scope", this.position());
        }

        const { position } = this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            throw new ErrorParser("Expected define identifier after define keyword", this.position());
        }

        const identifier = this.next().value;

        if (this.isNotOf(TokenType.AssignmentOperator)) {
            throw new ErrorParser("Expected equals sign after identifier in define declaration", this.position());
        }

        this.next();

        const value: ParserValue = this.parseExpression();

        if (this.isNotOf(TokenType.Semicolon)) {
            throw new ErrorParser("Expected a semicolon after variable declaration", this.position());
        }

        this.next();

        return {
            type: NodeType.DefineDeclaration,
            identifier,
            value,
            position
        } as DefineDeclaration;
    }

    private parseObjectDeclaration(): ObjectDeclaration {
        if (this.isNotOf(TokenType.Agent)) {
            throw new ErrorParser("Expected agent keyword in program scope", this.position());
        }

        const { position } = this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            throw new ErrorParser("Expected agent identifier after agent keyword", this.position());
        }

        const identifier = this.next().value;

        if (this.isNotOf(TokenType.Number) && this.isNotOf(TokenType.Identifier)) {
            throw new ErrorParser("Expected number of agents after agent identifier", this.position());
        }

        const count = this.parseExpression();

        if (this.isNotOf(TokenType.OpenBrace)) {
            throw new ErrorParser("Expected an open brace after number of agents in agent declaration", this.position());
        }

        this.next();

        const body: VariableDeclaration[] = [];

        while (this.at().type !== TokenType.CloseBrace) {
            switch (this.at().type) {
                case TokenType.Property:
                case TokenType.Const:
                    const declaration: ParserValue = this.parseVariableDeclaration();
                    body.push(declaration as VariableDeclaration);
                    break;
                default:
                    throw new ErrorParser("Only variable declarations are allowed in agent body", this.position());
            }
        }

        if (this.isNotOf(TokenType.CloseBrace)) {
            throw new ErrorParser("Expected a close brace after agent body declaration", this.position());
        }

        this.next();

        return {
            type: NodeType.ObjectDeclaration,
            identifier,
            count,
            body,
            position
        } as ObjectDeclaration;
    }

    public parseVariableDeclaration(): VariableDeclaration {
        if (this.isNotOf(TokenType.Property) && this.isNotOf(TokenType.Const)) {
            throw new ErrorParser("Expected property or const keyword at the beginning of variable declaration", this.position());
        }

        const { position, type } = this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            throw new ErrorParser("Expected identifier after variable type in variable declaration", this.position());
        }
        
        const identifier = this.next().value;
        let defaultValue: ParserValue | undefined;

        if (this.at().type === TokenType.Colon) {
            if (type === TokenType.Const) {
                throw new ErrorParser("Const properties cannot have a default value", this.at().position);
            }

            this.next();
            defaultValue = this.parseExpression();
        }

        if (this.isNotOf(TokenType.AssignmentOperator)) {
            throw new ErrorParser("Expected equals sign after identifier in variable declaration", this.position());
        }

        this.next();

        const value: ParserValue = this.parseExpression();

        if (this.isNotOf(TokenType.Semicolon)) {
            throw new ErrorParser("Expected a semicolon after variable declaration", this.position());
        }

        this.next();

        function getVariableType() {
            if (type === TokenType.Property) {
                return VariableType.Property;
            } else if (type === TokenType.Const) {
                return VariableType.Const;
            }
        }

        return {
            type: NodeType.VariableDeclaration,
            variableType: getVariableType(),
            identifier,
            value,
            default: defaultValue,
            position
        } as VariableDeclaration;
    }

    private parseExpression(): Expression {
        return this.parseOtherwiseExpression();
    }

    private parseOtherwiseExpression(): Expression {
        const left = this.parseLambdaExpression();

        if (this.at().type === TokenType.Otherwise) {
            const { position } = this.next();

            const right = this.parseLambdaExpression();

            return {
                type: NodeType.OtherwiseExpression,
                left,
                right,
                position
            } as OtherwiseExpression;
        }

        return left;
    }

    private parseLambdaExpression(): Expression {
        const base = this.parseConditionalExpression();

        if (this.at().type === TokenType.LambdaArrow) {
            this.next();
            const param = this.next().value;

            if (this.isNotOf(TokenType.LambdaArrow)) {
                throw new ErrorParser("Expected a lambda arrow after param in lambda expression", this.position());
            }

            const { position } = this.next();

            const value = this.parseConditionalExpression();

            return {
                type: NodeType.LambdaExpression,
                base,
                param,
                value,
                position,
            } as LambdaExpression;
        }

        return base;
    }

    private parseConditionalExpression(): Expression {
        if (this.at().type === TokenType.If) {
            const { position } = this.next();

            const condition = this.parseExpression();

            if (this.isNotOf(TokenType.Then)) {
                throw new ErrorParser("Expected then keyword after if condition", this.position());
            }

            this.next();

            const consequent = this.parseExpression();

            if (this.isNotOf(TokenType.Else)) {
                throw new ErrorParser("Expected else keyword after then consequent", this.position());
            }

            this.next();

            const alternate = this.parseExpression();

            return {
                type: NodeType.ConditionalExpression,
                condition,
                consequent,
                alternate,
                position
            } as ConditionalExpression;
        }

        return this.parseLogicalExpression();
    }

    private parseLogicalExpression(): Expression {
        let left = this.parseComparisonExpression();

        while (this.at().type === TokenType.RelationalOperator && (this.at().value === "and" || this.at().value === "or")) {
            const token = this.next();
            const operator = token.value;
            const position = token.position;

            const right = this.parseComparisonExpression();

            left = {
                type: NodeType.LogicalExpression,
                left,
                right,
                operator,
                position,
            } as LogicalExpression;
        }

        return left;
    }

    private parseComparisonExpression(): Expression {
        let left = this.parseAdditiveExpression();

        while (this.at().type === TokenType.RelationalOperator && this.at().value !== "and" && this.at().value !== "or") {
            const token = this.next();
            const operator = token.value;
            const position = token.position;

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
            const token = this.next();
            const operator = token.value;
            const position = token.position;

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
        let left = this.parseMemberExpression();

        while (this.at().value === "*" || this.at().value === "/" || this.at().value === "%") {
            const token = this.next();
            const operator = token.value;
            const position = token.position;

            const right = this.parseMemberExpression();

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

    private parseMemberExpression(): Expression {
        const caller = this.parseCallExpression();

        if (this.at().type === TokenType.Dot) {
            const { position } = this.next();

            const value = this.parseCallExpression();

            return {
                type: NodeType.MemberExpression,
                caller,
                value,
                position
            } as MemberExpression;
        }

        return caller;
    }

    private parseCallExpression(): Expression {
        const caller = this.parsePrimaryExpression();

        if (this.at().type === TokenType.OpenParen) {
            const args: ParserValue[] = this.parseArguments();

            return {
                type: NodeType.CallExpression,
                caller,
                args,
                position: caller.position
            } as CallExpression;
        }

        return caller;
    }

    private parseArguments(): Expression[] {
        if (this.isNotOf(TokenType.OpenParen)) {
            throw new ErrorParser("Expected an open parenthesis before function arguments", this.position());
        }

        this.next();

        let args: ParserValue[];

        if (this.at().type === TokenType.CloseParen) {
            args = [];
        } else {
            const argsList = this.parseArgumentsList();
            args = argsList;
        }

        if (this.isNotOf(TokenType.CloseParen)) {
            throw new ErrorParser("Expected a closing parenthesis after function arguments", this.position());
        }

        this.next();

        return args;
    }

    private parseArgumentsList(): Expression[] {
        const firstArg = this.parseExpression();

        const args = [firstArg];

        while (this.at().type === TokenType.Comma && this.next()) {
            const nextArg = this.parseExpression();

            args.push(nextArg);
        }

        return args;
    }

    private parsePrimaryExpression(): Expression {
        const token = this.at();

        switch (token.type) {
            case TokenType.Identifier: {
                this.next();

                return {
                    type: NodeType.Identifier,
                    identifier: token.value,
                    position: token.position,
                } as Identifier;
            }
            case TokenType.Number: {
                this.next();

                return {
                    type: NodeType.NumericLiteral,
                    value: parseFloat(token.value),
                    position: token.position
                } as NumericLiteral;
            }
            // parse negative numbers
            case TokenType.BinaryOperator: {
                if (token.value !== "+" && token.value !== "-") {
                    throw new ErrorParser("Unary expression requires operator + or -.", this.position());
                }

                if (this.getNext().type !== TokenType.Number && this.getNext().type !== TokenType.Identifier) {
                    throw new ErrorParser("Unary expression requires value of type number or identifier", this.position());
                }

                this.next();

                return {
                    type: NodeType.UnaryExpression,
                    operator: token.value,
                    value: this.parsePrimaryExpression(),
                    position: token.position
                } as UnaryExpression;
            }
            case TokenType.UnaryOperator: {
                if (token.value !== "!") {
                    throw new ErrorParser("Unary expression requires operator !.", this.position());
                }

                if (this.getNext().type !== TokenType.Boolean && this.getNext().type !== TokenType.Identifier) {
                    throw new ErrorParser("Unary expression requires value of type boolean or identifier", this.position());
                }

                this.next();

                return {
                    type: NodeType.UnaryExpression,
                    operator: token.value,
                    value: this.parsePrimaryExpression(),
                    position: token.position
                } as UnaryExpression;
            }
            case TokenType.Boolean: {
                this.next();

                return {
                    type: NodeType.BooleanLiteral,
                    value: token.value === "true",
                    position: token.position
                } as BooleanLiteral;
            }
            case TokenType.OpenParen: {
                this.next();
                const value: ParserValue = this.parseExpression();

                if (this.isNotOf(TokenType.CloseParen)) {
                    throw new ErrorParser("Expected a closing parenthesis after an opening parenthesis", this.position());
                }

                this.next();
                
                return value;
            }
            default:
                throw new ErrorParser("Unexpected token found during parsing: " + this.at().value, this.position());
        }
    }

    private at(): Token {
        return this.tokens[0];
    }

    private next(): Token {
        return this.tokens.shift() as Token;
    }

    private getNext(): Token {
        if (this.tokens.length <= 2) {
            throw new ErrorParser("No tokens left to parse");
        }

        return this.tokens[1];
    }

    private position(): Position {
        return this.at().position;
    }

    private isNotOf(type: TokenType): boolean {
        return this.at().type !== type;
    }

    private notEndOfFile() {
        return this.tokens[0].type !== TokenType.EOF;
    }

    private createEmptyProgram(): Program {
        return { type: NodeType.Program, body: [], position: { line: 0, character: 0 } };
    }
}