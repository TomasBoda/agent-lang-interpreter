import { exit } from "process";
import { Token, TokenType } from "../lexer/lexer.types";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, Expression, Identifier, LambdaExpression, LogicalExpression, MemberExpression, NodeType, NumericLiteral, ObjectDeclaration, ParserError, ParserValue, Program, Statement, UnaryExpression, VariableDeclaration, VariableType } from "./parser.types";
import { Error } from "../utils/error";
import { Position } from "../symbolizer/symbolizer.types";
import { getProgram } from "./optimizer";

export class Parser {

    private readonly tokens: Token[];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public parse(): ParserValue {
        const program: Program = this.createEmptyProgram();

        while (this.notEndOfFile()) {
            const statement: ParserValue = this.parseStatement();

            if (this.isError(statement)) {
                return statement as ParserError;
            }

            program.body.push(statement as Statement);
        }

        const updated: Program | ParserError = getProgram(program);

        if (updated.type === NodeType.Error) {
            return updated as ParserError;
        }

        return updated;
    }

    private parseStatement(): ParserValue {
        switch (this.at().type) {
            case TokenType.Agent:
                return this.parseObjectDeclaration();
            default:
                return Error.parser("Only agent declarations are allowed in program scope", this.position());
        }
    }

    private parseObjectDeclaration(): ParserValue {
        if (this.isNotOf(TokenType.Agent)) {
            return Error.parser("Expected agent keyword in program scope", this.position()) as ParserError;
        }

        this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            return Error.parser("Expected agent identifier after agent keyword", this.position()) as ParserError;
        }

        const identifier = this.next().value;

        if (this.isNotOf(TokenType.Number)) {
            return Error.parser("Expected number of agents after agent identifier", this.position()) as ParserError;
        }

        const count = this.next().value;

        if (this.isNotOf(TokenType.OpenBrace)) {
            return Error.parser("Expected an open brace after number of agents in agent declaration", this.position()) as ParserError;
        }

        this.next();

        const body: VariableDeclaration[] = [];

        while (this.at().type !== TokenType.CloseBrace) {
            switch (this.at().type) {
                case TokenType.Property:
                case TokenType.Const:
                    const declaration: ParserValue = this.parseVariableDeclaration();

                    if (this.isError(declaration)) {
                        return declaration as ParserError;
                    }

                    body.push(declaration as VariableDeclaration);
                    break;
                default:
                    return Error.parser("Only variable declarations are allowed in agent body", this.position()) as ParserError;
            }
        }

        if (this.isNotOf(TokenType.CloseBrace)) {
            return Error.parser("Expected a close brace after agent body declaration", this.position()) as ParserError;
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
            return Error.parser("Expected property or const keyword at the beginning of variable declaration", this.position()) as ParserError;
        }

        const variableType = this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            return Error.parser("Expected identifier after variable type in variable declaration", this.position()) as ParserError;
        }
        
        const identifier = this.next().value;
        let defaultValue: ParserValue | undefined;

        if (this.at().type === TokenType.Colon) {
            if (variableType.type === TokenType.Const) {
                return Error.parser("Const properties cannot have a default value", this.at().position);
            }

            this.next();
            defaultValue = this.parseExpression();

            if (this.isError(defaultValue)) {
                return defaultValue as ParserError;
            }
        }

        if (this.isNotOf(TokenType.AssignmentOperator)) {
            return Error.parser("Expected equals sign after identifier in variable declaration", this.position()) as ParserError;
        }

        this.next();

        const value: ParserValue = this.parseExpression();

        if (this.isError(value)) {
            return value as ParserError;
        }

        if (this.isNotOf(TokenType.Semicolon)) {
            return Error.parser("Expected a semicolon after variable declaration", this.position()) as ParserError;
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
        return this.parseLambdaExpression();
    }

    private parseLambdaExpression(): ParserValue {
        const base = this.parseConditionalExpression();

        if (this.at().type === TokenType.LambdaArrow) {
            this.next();
            const param = this.next().value;

            if (this.isNotOf(TokenType.LambdaArrow)) {
                return Error.parser("Expected a lambda arrow after param in lambda expression", this.position());
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

            if (this.isError(condition)) {
                return condition as ParserError;
            }

            if (this.isNotOf(TokenType.Then)) {
                return Error.parser("Expected then keyword after if condition", this.position()) as ParserError;
            }

            this.next();

            const consequent = this.parseExpression();

            if (this.isError(consequent)) {
                return consequent as ParserError;
            }

            if (this.isNotOf(TokenType.Else)) {
                return Error.parser("Expected else keyword after then consequent", this.position());
            }

            this.next();

            const alternate = this.parseExpression();

            if (this.isError(alternate)) {
                return alternate as ParserError;
            }

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

        if (this.isError(left)) {
            return left as ParserError;
        }

        while (this.at().type === TokenType.RelationalOperator && (this.at().value === "and" || this.at().value === "or")) {
            const operator = this.next().value;
            const right = this.parseComparisonExpression();

            if (this.isError(right)) {
                return right as ParserError;
            }

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

        if (this.isError(left)) {
            return left as ParserError;
        }

        while (this.at().type === TokenType.RelationalOperator && this.at().value !== "and" && this.at().value !== "or") {
            const operator = this.next().value;
            const right = this.parseAdditiveExpression();

            if (this.isError(right)) {
                return right as ParserError;
            }

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

        if (this.isError(left)) {
            return left as ParserError;
        }

        while (this.at().value === "+" || this.at().value === "-") {
            const operator = this.next().value;
            const right = this.parseMultiplicativeExpression();

            if (this.isError(right)) {
                return right as ParserError;
            }

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

        if (this.isError(left)) {
            return left as ParserError;
        }

        while (this.at().value === "*" || this.at().value === "/" || this.at().value === "%") {
            const operator = this.next().value;
            const right = this.parseMemberExpression();

            if (this.isError(right)) {
                return right as ParserError;
            }

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

        if (this.isError(caller)) {
            return caller as ParserError;
        }

        if (this.at().type === TokenType.OpenParen) {
            const args: ParserValue[] = this.parseArguments();

            if (args.length === 1 && this.isError(args[0])) {
                return args[0] as ParserError;
            }

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
            return [Error.parser("Expected an open parenthesis before function arguments", this.position()) as ParserError];
        }

        this.next();

        let args: ParserValue[];

        if (this.at().type === TokenType.CloseParen) {
            args = [];
        } else {
            const argsList = this.parseArgumentsList();

            if (argsList.length === 1 && this.isError(argsList[0])) {
                return [argsList[0] as ParserError];
            }

            args = argsList;
        }

        if (this.isNotOf(TokenType.CloseParen)) {
            return [Error.parser("Expected a closing parenthesis after function arguments", this.position()) as ParserError];
        }

        this.next();

        return args;
    }

    private parseArgumentsList(): ParserValue[] {
        const firstArg = this.parseExpression();

        if (this.isError(firstArg)) {
            return [firstArg as ParserError];
        }

        const args = [firstArg];

        while (this.at().type === TokenType.Comma && this.next()) {
            const nextArg = this.parseExpression();

            if (this.isError(nextArg)) {
                return [nextArg as ParserError];
            }

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
                    return Error.parser("Unary expression requires operator + or -.", this.position());
                }

                if (this.getNext().type !== TokenType.Number && this.getNext().type !== TokenType.Identifier) {
                    return Error.parser("Unary expression requires value of type number or identifier", this.position());
                }

                this.next();

                return {
                    type: NodeType.UnaryExpression,
                    operator: token.value,
                    value: this.parsePrimaryExpression(),
                } as UnaryExpression;
            
            case TokenType.UnaryOperator:
                if (token.value !== "!") {
                    return Error.parser("Unary expression requires operator !.", this.position());
                }

                if (this.getNext().type !== TokenType.Boolean && this.getNext().type !== TokenType.Identifier) {
                    return Error.parser("Unary expression requires value of type boolean or identifier", this.position());
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

                if (this.isError(value)) {
                    return value as ParserError;
                }

                if (this.isNotOf(TokenType.CloseParen)) {
                    return Error.parser("Expected a closing parenthesis after an opening parenthesis", this.position()) as ParserError;
                }

                this.next();
                
                return value;
            
            default:
                return Error.parser("Unexpected token found during parsing: " + this.at().value, this.position()) as ParserError;
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

    private isError(node: ParserValue): boolean {
        return node.type === NodeType.Error;
    }

    private notEndOfFile() {
        return this.tokens[0].type !== TokenType.EOF;
    }

    private createEmptyProgram(): Program {
        return { type: NodeType.Program, body: [] };
    }
}