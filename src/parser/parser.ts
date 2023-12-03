import { exit } from "process";
import { Token, TokenType } from "../lexer/lexer.types";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, Expression, Identifier, LambdaExpression, LogicalExpression, MemberExpression, NodeType, NumericLiteral, ObjectDeclaration, OtherwiseExpression, ParserValue, Program, Statement, UnaryExpression, VariableDeclaration, VariableType } from "./parser.types";
import { Position } from "../symbolizer/symbolizer.types";
import { getProgram } from "./topology/optimizer";
import { ErrorParser } from "../utils/errors";

export class Parser {

    private readonly tokens: Token[];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public parse(): ParserValue {
        const program: Program = this.createEmptyProgram();

        while (this.notEndOfFile()) {
            const statement: ParserValue = this.parseStatement();
            program.body.push(statement as Statement);
        }

        return getProgram(program);
    }

    private parseStatement(): ParserValue {
        switch (this.at().type) {
            case TokenType.Agent:
                return this.parseObjectDeclaration();
            default:
                throw new ErrorParser("Only agent declarations are allowed in program scope", this.position());
        }
    }

    private parseObjectDeclaration(): ParserValue {
        if (this.isNotOf(TokenType.Agent)) {
            throw new ErrorParser("Expected agent keyword in program scope", this.position());
        }

        this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            throw new ErrorParser("Expected agent identifier after agent keyword", this.position());
        }

        const identifier = this.next().value;

        if (this.isNotOf(TokenType.Number)) {
            throw new ErrorParser("Expected number of agents after agent identifier", this.position());
        }

        const count = this.next().value;

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
            count: parseFloat(count),
            body
        } as ObjectDeclaration;
    }

    private parseVariableDeclaration(): ParserValue {
        if (this.isNotOf(TokenType.Property) && this.isNotOf(TokenType.Const)) {
            throw new ErrorParser("Expected property or const keyword at the beginning of variable declaration", this.position());
        }

        const variableType = this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            throw new ErrorParser("Expected identifier after variable type in variable declaration", this.position());
        }
        
        const identifier = this.next().value;
        let defaultValue: ParserValue | undefined;

        if (this.at().type === TokenType.Colon) {
            if (variableType.type === TokenType.Const) {
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
            if (variableType.type === TokenType.Property) {
                return VariableType.Property;
            } else if (variableType.type === TokenType.Const) {
                return VariableType.Const;
            }
        }

        return {
            type: NodeType.VariableDeclaration,
            variableType: getVariableType(),
            identifier,
            value,
            default: defaultValue
        } as VariableDeclaration;
    }

    private parseExpression(): ParserValue {
        return this.parseOtherwiseExpression();
    }

    private parseOtherwiseExpression(): ParserValue {
        const left = this.parseLambdaExpression();

        if (this.at().type === TokenType.Otherwise) {
            this.next();

            const right = this.parseLambdaExpression();

            return {
                type: NodeType.OtherwiseExpression,
                left,
                right
            } as OtherwiseExpression;
        }

        return left;
    }

    private parseLambdaExpression(): ParserValue {
        const base = this.parseConditionalExpression();

        if (this.at().type === TokenType.LambdaArrow) {
            this.next();
            const param = this.next().value;

            if (this.isNotOf(TokenType.LambdaArrow)) {
                throw new ErrorParser("Expected a lambda arrow after param in lambda expression", this.position());
            }

            this.next();

            const value = this.parseConditionalExpression();

            return {
                type: NodeType.LambdaExpression,
                base,
                param,
                value
            } as LambdaExpression;
        }

        return base;
    }

    private parseConditionalExpression(): ParserValue {
        if (this.at().type === TokenType.If) {
            this.next();

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
                alternate
            } as ConditionalExpression;
        }

        return this.parseLogicalExpression();
    }

    private parseLogicalExpression(): ParserValue {
        let left = this.parseComparisonExpression();

        while (this.at().type === TokenType.RelationalOperator && (this.at().value === "and" || this.at().value === "or")) {
            const operator = this.next().value;
            const right = this.parseComparisonExpression();

            left = {
                type: NodeType.LogicalExpression,
                left,
                right,
                operator
            } as LogicalExpression;
        }

        return left;
    }

    private parseComparisonExpression(): ParserValue {
        let left = this.parseAdditiveExpression();

        while (this.at().type === TokenType.RelationalOperator && this.at().value !== "and" && this.at().value !== "or") {
            const operator = this.next().value;
            const right = this.parseAdditiveExpression();

            left = {
                type: NodeType.BinaryExpression,
                left,
                right,
                operator
            } as BinaryExpression;
        }

        return left;
    }

    private parseAdditiveExpression(): ParserValue {
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

    private parseMultiplicativeExpression(): ParserValue {
        let left = this.parseMemberExpression();

        while (this.at().value === "*" || this.at().value === "/" || this.at().value === "%") {
            const operator = this.next().value;
            const right = this.parseMemberExpression();

            left = {
                type: NodeType.BinaryExpression,
                left,
                right,
                operator
            } as BinaryExpression;
        }

        return left;
    }

    private parseMemberExpression(): ParserValue {
        const caller = this.parseCallExpression();

        if (this.at().type === TokenType.Dot) {
            this.next();

            const value = this.parseCallExpression();

            return {
                type: NodeType.MemberExpression,
                caller,
                value
            } as MemberExpression;
        }

        return caller;
    }

    private parseCallExpression(): ParserValue {
        const caller = this.parsePrimaryExpression();

        if (this.at().type === TokenType.OpenParen) {
            const args: ParserValue[] = this.parseArguments();

            return {
                type: NodeType.CallExpression,
                caller,
                args
            } as CallExpression;
        }

        return caller;
    }

    private parseArguments(): ParserValue[] {
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

    private parseArgumentsList(): ParserValue[] {
        const firstArg = this.parseExpression();

        const args = [firstArg];

        while (this.at().type === TokenType.Comma && this.next()) {
            const nextArg = this.parseExpression();

            args.push(nextArg);
        }

        return args;
    }

    private parsePrimaryExpression(): ParserValue {
        const token = this.at();

        switch (token.type) {
            case TokenType.Identifier:
                return {
                    type: NodeType.Identifier,
                    identifier: this.next().value
                } as Identifier;
            
            case TokenType.Number:
                return {
                    type: NodeType.NumericLiteral,
                    value: parseFloat(this.next().value)
                } as NumericLiteral;
            
            // parse negative numbers
            case TokenType.BinaryOperator:
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
                } as UnaryExpression;
            
            case TokenType.UnaryOperator:
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
                } as UnaryExpression;

            case TokenType.Boolean:
                return {
                    type: NodeType.BooleanLiteral,
                    value: this.next().value === "true"
                } as BooleanLiteral;

            case TokenType.OpenParen:
                this.next();
                const value: ParserValue = this.parseExpression();

                if (this.isNotOf(TokenType.CloseParen)) {
                    throw new ErrorParser("Expected a closing parenthesis after an opening parenthesis", this.position());
                }

                this.next();
                
                return value;
            
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
            // TODO
            exit(0);
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
        return { type: NodeType.Program, body: [] };
    }
}