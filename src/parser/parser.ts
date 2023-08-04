import { Position, Token, TokenType } from "../lexer/lexer.types";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, Expression, Identifier, LogicalExpression, NodeType, NumericLiteral, ObjectDeclaration, ParserError, ParserValue, Program, Statement, VariableDeclaration, VariableType } from "./parser.types";
import { Error } from "../utils/error";

export class Parser {

    private tokens: Token[];

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

        return program;
    }

    private parseStatement(): ParserValue {
        switch (this.at().type) {
            case TokenType.Agent:
                return this.parseObjectDeclaration();
            default:
                return this.parserError("Only agent declarations are allowed in program scope");
        }
    }

    private parseObjectDeclaration(): ParserValue {
        if (this.isNotOf(TokenType.Agent)) {
            return this.parserError("Expected agent keyword in program scope") as ParserError;
        }

        this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            return this.parserError("Expected agent identifier after agent keyword") as ParserError;
        }

        const identifier = this.next().value;

        if (this.isNotOf(TokenType.Number)) {
            return this.parserError("Expected number of agents after agent identifier") as ParserError;
        }

        const count = this.next().value;

        if (this.isNotOf(TokenType.OpenBrace)) {
            return this.parserError("Expected an open brace after number of agents in agent declaration") as ParserError;
        }

        this.next();

        const body: VariableDeclaration[] = [];

        while (this.at().type !== TokenType.CloseBrace) {
            switch (this.at().type) {
                case TokenType.Variable:
                case TokenType.Const:
                case TokenType.Dynamic:
                    const declaration: ParserValue = this.parseVariableDeclaration();

                    if (this.isError(declaration)) {
                        return declaration as ParserError;
                    }

                    body.push(declaration as VariableDeclaration);
                    break;
                default:
                    return this.parserError("Only variable declarations are allowed in agent body") as ParserError;
            }
        }

        if (this.isNotOf(TokenType.CloseBrace)) {
            return this.parserError("Expected a close brace after agent body declaration") as ParserError;
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
        if (this.isNotOf(TokenType.Variable) && this.isNotOf(TokenType.Dynamic) && this.isNotOf(TokenType.Const)) {
            return this.parserError("Expected variable type at the beginning of variable declaration") as ParserError;
        }

        const variableType = this.next().type;

        if (this.isNotOf(TokenType.Identifier)) {
            return this.parserError("Expected identifier after variable type in variable declaration") as ParserError;
        }
        
        const identifier = this.next().value;
        let defaultValue: ParserValue | undefined;

        if (variableType === TokenType.Variable) {
            if (this.isNotOf(TokenType.Colon)) {
                return this.parserError("Expected a colon after identifier in variable type declaration") as ParserError;
            }

            this.next();
            
            defaultValue = this.parseExpression();

            if (this.isError(defaultValue)) {
                return defaultValue as ParserError;
            }
        }

        if (this.isNotOf(TokenType.Equals)) {
            return this.parserError("Expected equals sign after identifier in variable declaration") as ParserError;
        }

        this.next();

        const value: ParserValue = this.parseExpression();

        if (variableType === TokenType.Const && !this.isConstValueValid(value)) {
            return this.parserError("Const cannot contain identifiers");
        }

        if (this.isError(value)) {
            return value as ParserError;
        }

        if (this.isNotOf(TokenType.Semicolon)) {
            return this.parserError("Expected a semicolon after variable declaration") as ParserError;
        }

        this.next();

        function getVariableType() {
            if (variableType === TokenType.Variable) {
                return VariableType.Variable;
            } else if (variableType === TokenType.Dynamic) {
                return VariableType.Dynamic;
            } else {
                return VariableType.Const;
            }
        }

        return {
            type: NodeType.VariableDeclaration,
            variableType: getVariableType(),
            identifier,
            default: defaultValue,
            value
        } as VariableDeclaration;
    }

    private parseExpression(): ParserValue {
        return this.parseConditionalExpression();
    }

    private parseConditionalExpression(): ParserValue {
        if (this.at().type === TokenType.If) {
            this.next();

            const condition = this.parseExpression();

            if (this.isError(condition)) {
                return condition as ParserError;
            }

            if (this.isNotOf(TokenType.Then)) {
                return this.parserError("Expected then keyword after if condition") as ParserError;
            }

            this.next();

            const consequent = this.parseExpression();

            if (this.isError(consequent)) {
                return consequent as ParserError;
            }

            if (this.isNotOf(TokenType.Else)) {
                return this.parserError("Expected else keyword after then consequent");
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

        while (this.at().type === TokenType.And || this.at().type === TokenType.Or) {
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

        while (this.at().value === "==" || this.at().value === ">" || this.at().value === ">=" || this.at().value === "<" || this.at().value === "<=") {
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
        let left = this.parseCallExpression();

        if (this.isError(left)) {
            return left as ParserError;
        }

        while (this.at().value === "*" || this.at().value === "/" || this.at().value === "%") {
            const operator = this.next().value;
            const right = this.parseCallExpression();

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
            return [this.parserError("Expected an open parenthesis before function arguments") as ParserError];
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
            return [this.parserError("Expected a closing parenthesis after function arguments") as ParserError];
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
                if (token.value === "-") {
                    if (this.getNext().type !== TokenType.Number) {
                        return this.parserError("Negative signmust preceed a number");
                    }

                    return {
                        type: NodeType.NumericLiteral,
                        value: parseFloat(this.next().value + this.next().value)
                    } as NumericLiteral
                }

            case TokenType.Boolean:
                return {
                    type: NodeType.BooleanLiteral,
                    value: this.next().value === "true" ? true : false
                } as BooleanLiteral;

            case TokenType.OpenParen:
                this.next();
                const value: ParserValue = this.parseExpression();

                if (this.isError(value)) {
                    return value as ParserError;
                }

                if (this.isNotOf(TokenType.CloseParen)) {
                    return this.parserError("Expected a closing parenthesis after an opening parenthesis") as ParserError;
                }

                this.next();
                
                return value;
            
            default:
                return this.parserError("Unexpected token found during parsing: " + this.at().value) as ParserError;
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

    private isNotOf(type: TokenType): boolean {
        return this.at().type !== type;
    }

    private isError(node: ParserValue): boolean {
        return node.type === NodeType.Error;
    }

    private parserError(message: string): ParserError {
        return { type: NodeType.Error, message } as ParserError;
    }

    private notEndOfFile() {
        return this.tokens[0].type !== TokenType.EOF;
    }

    private createEmptyProgram(): Program {
        return { type: NodeType.Program, body: [] };
    }

    private isConstValueValid(value: ParserValue): boolean {
        if (value.type === NodeType.Identifier) {
            return false;
        }

        if (value.type === NodeType.BinaryExpression) {
            const left = this.isConstValueValid((value as BinaryExpression).left);
            const right = this.isConstValueValid((value as BinaryExpression).right);
            return left && right;
        }

        if (value.type === NodeType.LogicalExpression) {
            const left = this.isConstValueValid((value as LogicalExpression).left);
            const right = this.isConstValueValid((value as LogicalExpression).right);
            return left && right;
        }

        if (value.type === NodeType.ConditionalExpression) {
            const condition = this.isConstValueValid((value as ConditionalExpression).condition);
            const consequent = this.isConstValueValid((value as ConditionalExpression).consequent);
            const alternate = this.isConstValueValid((value as ConditionalExpression).alternate);
            return condition && consequent && alternate;
        }

        if (value.type === NodeType.CallExpression) {
            for (const arg of (value as CallExpression).args) {
                const result = this.isConstValueValid(arg as ParserValue);
                
                if (!result) {
                    return false;
                }
            }

            return true;
        }

        return true;
    }
}