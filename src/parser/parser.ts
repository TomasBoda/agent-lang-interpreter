import { Position } from "../symbolizer/index.ts";
import { Token, TokenType } from "../lexer/index.ts";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, DefineDeclaration, Expression, Identifier, SetComprehensionExpression, LogicalExpression, MemberExpression, NodeType, NumericLiteral, ObjectDeclaration, OtherwiseExpression, ParserValue, Program, Statement, UnaryExpression, VariableDeclaration, VariableType } from "./model/index.ts";
import { ErrorParser } from "../utils/index.ts";

export class Parser {

    private readonly tokens: Token[];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    /**
     * Parses the array of tokens into a program AST node
     * 
     * @returns program AST node
     */
    public parse(): Program {
        const program = this.createEmptyProgram();

        while (this.notEndOfFile()) {
            const statement = this.parseStatement();
            program.body.push(statement);
        }

        return program;
    }

    /**
     * Parser a generic statement AST node
     * 
     * @returns statement AST node
     */
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

    /**
     * Parses a define declaration AST node
     * 
     * @returns define declaration AST node
     */
    private parseDefineDeclaration(): DefineDeclaration {
        const position = this.assert(TokenType.Define, "Expected define keyword in define declaration", this.position()).position;
        const identifier = this.assert(TokenType.Identifier, "Expected identifier after define keyword in define declaration", this.position()).value;

        this.assert(TokenType.AssignmentOperator, "Expected assignment symbol after identifier in define declaration", this.position());

        const value = this.parseExpression();

        this.assert(
            TokenType.Semicolon,
            "Expected a semicolon after value in define declaration",
            this.position()
        );

        return {
            type: NodeType.DefineDeclaration,
            identifier,
            value,
            position
        };
    }

    /**
     * Parses an object declaration AST node
     * 
     * @returns object declaration AST node
     */
    private parseObjectDeclaration(): ObjectDeclaration {
        const { position } = this.assert(TokenType.Agent, "Expected agent keyword in agent declaration", this.position());
        const identifier = this.assert(TokenType.Identifier, "Expected agent identifier after agent keyword in agent declaration", this.position()).value;

        this.assertMulti(TokenType.Number, TokenType.Identifier, "Expected number of agents after agent identifier in agent declaration", this.position(), false);

        const count = this.parseExpression();

        this.assert(TokenType.OpenBrace, "Expected an open brace after number of agents in agent declaration", this.position());

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

        this.assert(TokenType.CloseBrace, "Expected a close brace after agent body in agent declaration", this.position());

        return {
            type: NodeType.ObjectDeclaration,
            identifier,
            count,
            body,
            position
        };
    }

    /**
     * Parses a variable declaration AST node
     * 
     * @returns variable declaration AST node
     */
    public parseVariableDeclaration(): VariableDeclaration {
        const { position, type } = this.assertMulti(TokenType.Property, TokenType.Const, "Expected property or const keyword in property declaration", this.position());
        const identifier = this.assert(TokenType.Identifier, "Expected identifier after property type in property declaration", this.position()).value;

        let defaultValue: Expression | undefined;

        if (this.at().type === TokenType.Colon) {
            if (type === TokenType.Const) {
                throw new ErrorParser("Const property cannot have a default value", this.at().position);
            }

            this.next();
            defaultValue = this.parseExpression();
        }

        this.assert(TokenType.AssignmentOperator, "Expected assignment symbol after identifier in property declaration", this.position());

        const value: ParserValue = this.parseExpression();

        this.assert(TokenType.Semicolon, "Expected a semicolon after value in property declaration", this.position());

        return {
            type: NodeType.VariableDeclaration,
            variableType: this.getVariableType(type),
            identifier,
            value,
            default: defaultValue,
            position
        };
    }

    /**
     * Parses a generic expression AST node
     * 
     * @returns expression AST node
     */
    private parseExpression(): Expression {
        return this.parseOtherwiseExpression();
    }

    /**
     * Parses an otherwise expression AST node
     * 
     * @returns expression AST node
     */
    private parseOtherwiseExpression(): Expression {
        const left = this.parseSetComprehensionExpression();

        if (this.at().type === TokenType.Otherwise) {
            const { position } = this.next();
            const right = this.parseSetComprehensionExpression();

            const otherwiseExpression: OtherwiseExpression = {
                type: NodeType.OtherwiseExpression,
                left,
                right,
                position
            };

            return otherwiseExpression;
        }

        return left;
    }

    /**
     * Parses a set comprehension expression AST node
     * 
     * @returns expression AST node
     */
    private parseSetComprehensionExpression(): Expression {
        const base = this.parseConditionalExpression();

        if (this.at().type === TokenType.Divider) {
            this.next();
            const param = this.next().value;

            const { position } = this.assert(TokenType.Arrow, "Expected an arrow after parameter in set comprehension expression", this.position());
            const value = this.parseConditionalExpression();

            const SetComprehensionExpression: SetComprehensionExpression = {
                type: NodeType.SetComprehensionExpression,
                base,
                param,
                value,
                position,
            };

            return SetComprehensionExpression;
        }

        return base;
    }

    /**
     * Parses a conditional expression AST node
     * 
     * @returns expression AST node
     */
    private parseConditionalExpression(): Expression {
        if (this.at().type === TokenType.If) {
            const { position } = this.next();

            const condition = this.parseConditionalExpression();

            this.assert(TokenType.Then, "Expected then keyword after condition in conditional expression", this.position());

            const consequent = this.parseConditionalExpression();

            this.assert(TokenType.Else, "Expected else keyword after consequent in conditional expression", this.position());

            const alternate = this.parseConditionalExpression();

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

    /**
     * Parses a logical expression AST node
     * 
     * @returns expression AST node
     */
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

    /**
     * Parses a comparison binary expression AST node
     * 
     * @returns expression AST node
     */
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

    /**
     * Parses an additive binary expression AST node
     * 
     * @returns expression AST node
     */
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

    /**
     * Parses a multiplicative expression AST node
     * 
     * @returns expression AST node
     */
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

    /**
     * Parses a member expression AST node
     * 
     * @returns expression AST node
     */
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

    /**
     * Parses a call expression AST node
     * 
     * @returns expression AST node
     */
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

    /**
     * Parses a call expression AST node's arguments
     * 
     * @returns arguments of the call expression
     */
    private parseCallExpressionArguments(): Expression[] {
        this.assert(TokenType.OpenParen, "Expected an open parenthesis before function arguments in call expression", this.position());

        const args: Expression[] = this.at().type === TokenType.CloseParen ? [] : this.parseCallExpressionArgumentsList();

        this.assert(TokenType.CloseParen, "Expected a closing parenthesis after function arguments in call expression", this.position());

        return args;
    }

    /**
     * Parses a list of arguments of a call expression AST node
     * 
     * @returns arguments of the call expression
     */
    private parseCallExpressionArgumentsList(): Expression[] {
        const firstArg = this.parseExpression();
        const args = [firstArg];

        while (this.at().type === TokenType.Comma && this.next()) {
            const arg = this.parseExpression();
            args.push(arg);
        }

        return args;
    }

    /**
     * Parses a generic primary expression AST node
     * 
     * @returns expression AST node
     */
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

    /**
     * Parses an identifier AST node
     * 
     * @returns identifier AST node
     */
    private parseIdentifier(): Identifier {
        const { value, position } = this.next();

        const identifier: Identifier = {
            type: NodeType.Identifier,
            identifier: value,
            position,
        };

        return identifier;
    }

    /**
     * Parses a numeric literal AST node
     * 
     * @returns numeric literal AST node
     */
    private parseNumericLiteral(): NumericLiteral {
        const { value, position } = this.next();

        const numericLiteral: NumericLiteral = {
            type: NodeType.NumericLiteral,
            value: parseFloat(value),
            position: position
        };

        return numericLiteral;
    }

    /**
     * Parses a unary expression AST node representing a negative numeric literal
     * 
     * @returns unary expression AST node
     */
    private parseNegativeNumericLiteral(): UnaryExpression {
        const { value, position } = this.at();

        if (value !== "-") {
            throw new ErrorParser("Unary expression requires the - operator", this.position());
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

    /**
     * Parses a boolean literal AST node
     * 
     * @returns boolean literal AST node
     */
    private parseBooleanLiteral(): BooleanLiteral {
        const { value, position } = this.next();

        const booleanLiteral: BooleanLiteral = {
            type: NodeType.BooleanLiteral,
            value: value === "true",
            position: position
        };

        return booleanLiteral;
    }

    /**
     * Parses a unary expression AST node representing a negative boolean literal
     * 
     * @returns unary expression AST node
     */
    private parseNegativeBooleanLiteral(): UnaryExpression {
        const { value, position } = this.at();

        if (value !== "!") {
            throw new ErrorParser("Unary expression requires the ! operator", this.position());
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

    /**
     * Parses a parenthesised generic expression AST node
     * 
     * @returns expression AST node
     */
    private parseParenthesisedExpression(): Expression {
        this.next();
        const value: Expression = this.parseExpression();

        this.assert(TokenType.CloseParen, "Expected a closing parenthesis after an opening parenthesis", this.position());
        
        return value;
    }

    /**
     * Asserts the current token to be of a given type
     * 
     * @param type expected type of the current token
     * @param message error message in case of incorrect type
     * @param position position of the current token in the source code
     * @param next whether to move to the next token after successful assertion
     * @returns the current or next token
     */
    private assert(type: TokenType, message: string, position: Position, next = true): Token {
        if (this.isNotOf(type)) {
            throw new ErrorParser(message, position);
        }

        return next ? this.next() : this.at();
    }

    /**
     * Asserts the current token type to be of either of the given types
     * 
     * @param type1 first expected type of the current token
     * @param type2 second expected type of the current token
     * @param message error message in case of incorrect type
     * @param position position of the current token in the source code
     * @param next whether to move to the next token after successful assertion
     * @returns the current or next token
     */
    private assertMulti(type1: TokenType, type2: TokenType, message: string, position: Position, next = true): Token {
        if (this.isNotOf(type1) && this.isNotOf(type2)) {
            throw new ErrorParser(message, position);
        }

        return next ? this.next() : this.at();
    }

    /**
     * Returns the current token
     * 
     * @returns current token
     */
    private at(): Token {
        return this.tokens[0];
    }

    /**
     * Returns the current token and removes it from the stack
     * 
     * @returns current token
     */
    private next(): Token {
        return this.tokens.shift() as Token;
    }

    /**
     * Returns the position of the current token in the source code
     * 
     * @returns position of the current token
     */
    private position(): Position {
        return this.at().position;
    }

    /**
     * Asserts the current token's type to not be of the given type
     * 
     * @param type type to assert
     * @returns true if the types do not match, otherwise false
     */
    private isNotOf(type: TokenType): boolean {
        return this.at().type !== type;
    }

    /**
     * Checks whether the current token is not the EOF (end-of-file) token
     * 
     * @returns true if the current token is not the EOF token, otherwise false
     */
    private notEndOfFile(): boolean {
        return this.at().type !== TokenType.EOF;
    }

    /**
     * Converts the token type to variable type (property, const)
     * 
     * @param tokenType type of the token to convert
     * @returns variable type
     */
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

    /**
     * Creates an empty program AST node
     * 
     * @returns empty program AST node
     */
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