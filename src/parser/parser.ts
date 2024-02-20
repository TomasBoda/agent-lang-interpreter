import { Position } from "../symbolizer";
import { Token, TokenType } from "../lexer";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, DefineDeclaration, Expression, Identifier, LambdaExpression, LogicalExpression, MemberExpression, NodeType, NumericLiteral, ObjectDeclaration, OtherwiseExpression, ParserValue, Program, Statement, UnaryExpression, VariableDeclaration, VariableType } from "./model";
import { ErrorParser } from "../utils";
import { writeFileSync } from "fs";

export class Parser {

    private readonly tokens: Token[];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public parse(): Program {
        const program = this.createEmptyProgram();

        while (this.notEndOfFile()) {
            const statement = this.parseStatement();
            program.body.push(statement);
        }

        return program;
    }

    private parseStatement(): Statement {
        switch (this.at().type) {
            case TokenType.Define:
                return this.parseDefineDeclaration();
            case TokenType.Agent:
                return this.parseObjectDeclaration();
            default:
                throw new ErrorParser(`Only agent and define declarations are allowed in program scope, '${this.at().type}' provided`, this.position());
        }
    }

    private parseDefineDeclaration(): DefineDeclaration {
        if (this.isNotOf(TokenType.Define)) {
            throw new ErrorParser("Expected define keyword in define declaration", this.position());
        }

        const { position } = this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            throw new ErrorParser("Expected identifier after define keyword in define declaration", this.position());
        }

        const identifier = this.next().value;

        if (this.isNotOf(TokenType.AssignmentOperator)) {
            throw new ErrorParser("Expected assignment symbol after identifier in define declaration", this.position());
        }

        this.next();

        const value = this.parseExpression();

        if (this.isNotOf(TokenType.Semicolon)) {
            throw new ErrorParser("Expected a semicolon after value in define declaration", this.position());
        }

        this.next();

        const defineDeclaration: DefineDeclaration = {
            type: NodeType.DefineDeclaration,
            identifier,
            value,
            position
        };

        return defineDeclaration;
    }

    private parseObjectDeclaration(): ObjectDeclaration {
        if (this.isNotOf(TokenType.Agent)) {
            throw new ErrorParser("Expected agent keyword in agent declaration", this.position());
        }

        const { position } = this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            throw new ErrorParser("Expected agent identifier after agent keyword in agent declaration", this.position());
        }

        const identifier = this.next().value;

        if (this.isNotOf(TokenType.Number) && this.isNotOf(TokenType.Identifier)) {
            throw new ErrorParser("Expected number of agents after agent identifier in agent declaration", this.position());
        }

        const count = this.parseExpression();

        if (this.isNotOf(TokenType.OpenBrace)) {
            throw new ErrorParser("Expected an open brace after number of agents in agent declaration", this.position());
        }

        this.next();

        const body: VariableDeclaration[] = [];

        while (this.isNotOf(TokenType.CloseBrace)) {
            switch (this.at().type) {
                case TokenType.Property:
                case TokenType.Const:
                    const declaration = this.parseVariableDeclaration();
                    body.push(declaration);
                    break;
                default:
                    throw new ErrorParser("Only property and const declarations are allowed in agent body in agent declaration", this.position());
            }
        }

        if (this.isNotOf(TokenType.CloseBrace)) {
            throw new ErrorParser("Expected a close brace after agent body in agent declaration", this.position());
        }

        this.next();

        const objectDeclaration: ObjectDeclaration = {
            type: NodeType.ObjectDeclaration,
            identifier,
            count,
            body,
            position
        };

        return objectDeclaration;
    }

    public parseVariableDeclaration(): VariableDeclaration {
        if (this.isNotOf(TokenType.Property) && this.isNotOf(TokenType.Const)) {
            throw new ErrorParser("Expected property or const keyword in property declaration", this.position());
        }

        const { position, type } = this.next();

        if (this.isNotOf(TokenType.Identifier)) {
            throw new ErrorParser("Expected identifier after property type in property declaration", this.position());
        }
        
        const identifier = this.next().value;
        let defaultValue: Expression | undefined;

        if (this.at().type === TokenType.Colon) {
            if (type === TokenType.Const) {
                throw new ErrorParser("Const property cannot have a default value", this.at().position);
            }

            this.next();
            defaultValue = this.parseExpression();
        }

        if (this.isNotOf(TokenType.AssignmentOperator)) {
            throw new ErrorParser("Expected assignment symbol after identifier in property declaration", this.position());
        }

        this.next();

        const value: ParserValue = this.parseExpression();

        if (this.isNotOf(TokenType.Semicolon)) {
            throw new ErrorParser("Expected a semicolon after value in property declaration", this.position());
        }

        this.next();

        const variableDeclaration: VariableDeclaration = {
            type: NodeType.VariableDeclaration,
            variableType: this.getVariableType(type),
            identifier,
            value,
            default: defaultValue,
            position
        };

        return variableDeclaration;
    }

    private parseExpression(): Expression {
        return this.parseOtherwiseExpression();
    }

    private parseOtherwiseExpression(): Expression {
        const left = this.parseLambdaExpression();

        if (this.at().type === TokenType.Otherwise) {
            const { position } = this.next();
            const right = this.parseLambdaExpression();

            const otherwiseExpression: OtherwiseExpression = {
                type: NodeType.OtherwiseExpression,
                left,
                right,
                position
            }

            return otherwiseExpression;
        }

        return left;
    }

    private parseLambdaExpression(): Expression {
        const base = this.parseConditionalExpression();

        if (this.at().type === TokenType.LambdaArrow) {
            this.next();
            const param = this.next().value;

            if (this.isNotOf(TokenType.LambdaArrow)) {
                throw new ErrorParser("Expected a lambda arrow after parameter in lambda expression", this.position());
            }

            const { position } = this.next();
            const value = this.parseConditionalExpression();

            const lambdaExpression: LambdaExpression = {
                type: NodeType.LambdaExpression,
                base,
                param,
                value,
                position,
            };

            return lambdaExpression;
        }

        return base;
    }

    private parseConditionalExpression(): Expression {
        if (this.at().type === TokenType.If) {
            const { position } = this.next();

            const condition = this.parseExpression();

            if (this.isNotOf(TokenType.Then)) {
                throw new ErrorParser("Expected then keyword after condition in conditional expression", this.position());
            }

            this.next();

            const consequent = this.parseExpression();

            if (this.isNotOf(TokenType.Else)) {
                throw new ErrorParser("Expected else keyword after consequent in conditional expression", this.position());
            }

            this.next();

            const alternate = this.parseExpression();

            const conditionalExpression: ConditionalExpression = {
                type: NodeType.ConditionalExpression,
                condition,
                consequent,
                alternate,
                position
            };

            return conditionalExpression;
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

            const memberExpression: MemberExpression = {
                type: NodeType.MemberExpression,
                caller,
                value,
                position
            };

            return memberExpression;
        }

        return caller;
    }

    private parseCallExpression(): Expression {
        const caller = this.parsePrimaryExpression();

        if (this.at().type === TokenType.OpenParen) {
            const args: Expression[] = this.parseCallExpressionArguments();

            const callExpression: CallExpression = {
                type: NodeType.CallExpression,
                caller,
                args,
                position: caller.position
            };

            return callExpression;
        }

        return caller;
    }

    private parseCallExpressionArguments(): Expression[] {
        if (this.isNotOf(TokenType.OpenParen)) {
            throw new ErrorParser("Expected an open parenthesis before function arguments in call expression", this.position());
        }

        this.next();

        let args: Expression[];

        if (this.at().type === TokenType.CloseParen) {
            args = [];
        } else {
            args = this.parseCallExpressionArgumentsList();
        }

        if (this.isNotOf(TokenType.CloseParen)) {
            throw new ErrorParser("Expected a closing parenthesis after function arguments in call expression", this.position());
        }

        this.next();

        return args;
    }

    private parseCallExpressionArgumentsList(): Expression[] {
        const firstArg = this.parseExpression();
        const args = [firstArg];

        while (this.at().type === TokenType.Comma && this.next()) {
            const arg = this.parseExpression();
            args.push(arg);
        }

        return args;
    }

    private parsePrimaryExpression(): Expression {
        switch (this.at().type) {
            case TokenType.Identifier:
                return this.parseIdentifier();
            case TokenType.Number:
                return this.parseNumericLiteral();
            case TokenType.Boolean:
                return this.parseBooleanLiteral();
            case TokenType.BinaryOperator:
                return this.parseNegativeNumericLiteral();
            case TokenType.UnaryOperator:
                return this.parseNegativeBooleanLiteral();
            case TokenType.OpenParen:
                return this.parseParenthesisedExpression();
            default:
                throw new ErrorParser("Unexpected token found during parsing: " + this.at().value, this.position());
        }
    }

    private parseIdentifier(): Identifier {
        const { value, position } = this.next();

        const identifier: Identifier = {
            type: NodeType.Identifier,
            identifier: value,
            position,
        };

        return identifier;
    }

    private parseNumericLiteral(): NumericLiteral {
        const { value, position } = this.next();

        const numericLiteral: NumericLiteral = {
            type: NodeType.NumericLiteral,
            value: parseFloat(value),
            position: position
        };

        return numericLiteral;
    }

    private parseNegativeNumericLiteral(): UnaryExpression {
        const { value, position } = this.at();

        if (value !== "+" && value !== "-") {
            throw new ErrorParser("Unary expression requires operator + or -", this.position());
        }

        if (this.getNext().type !== TokenType.Number && this.getNext().type !== TokenType.Identifier) {
            throw new ErrorParser("Unary expression requires value of type number or identifier", this.position());
        }

        this.next();

        const unaryExpression: UnaryExpression = {
            type: NodeType.UnaryExpression,
            operator: value,
            value: this.parsePrimaryExpression(),
            position
        };

        return unaryExpression;
    }

    private parseBooleanLiteral(): BooleanLiteral {
        const { value, position } = this.next();

        const booleanLiteral: BooleanLiteral = {
            type: NodeType.BooleanLiteral,
            value: value === "true",
            position: position
        };

        return booleanLiteral;
    }

    private parseNegativeBooleanLiteral(): UnaryExpression {
        const { value, position } = this.at();

        if (value !== "!") {
            throw new ErrorParser("Unary expression requires operator !", this.position());
        }

        if (this.getNext().type !== TokenType.Boolean && this.getNext().type !== TokenType.Identifier) {
            throw new ErrorParser("Unary expression requires value of type boolean or identifier", this.position());
        }

        this.next();

        const unaryExpression: UnaryExpression = {
            type: NodeType.UnaryExpression,
            operator: value,
            value: this.parsePrimaryExpression(),
            position
        };

        return unaryExpression;
    }

    private parseParenthesisedExpression(): Expression {
        this.next();
        const value: Expression = this.parseExpression();

        if (this.isNotOf(TokenType.CloseParen)) {
            throw new ErrorParser("Expected a closing parenthesis after an opening parenthesis", this.position());
        }

        this.next();
        
        return value;
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
        return this.at().type !== TokenType.EOF;
    }

    private getVariableType(tokenType: TokenType): VariableType {
        switch (tokenType) {
            case TokenType.Property:
                return VariableType.Property;
            case TokenType.Const:
                return VariableType.Const;
            default:
                throw new ErrorParser(`Unkown property type '${tokenType}'`);
        }
    }

    private createEmptyProgram(): Program {
        return {
            type: NodeType.Program,
            body: [],
            position: {
                line: 0,
                character: 0
            }
        };
    }
}