"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
var lexer_types_1 = require("../lexer/lexer.types");
var ast_types_1 = require("./ast.types");
var error_1 = require("../lib/error");
var Parser = /** @class */ (function () {
    function Parser(tokens) {
        this.tokens = tokens;
    }
    Parser.prototype.parse = function () {
        var program = this.createEmptyProgram();
        while (this.notEndOfFile()) {
            program.body.push(this.parseStatement());
        }
        return program;
    };
    Parser.prototype.parseStatement = function () {
        switch (this.at().type) {
            case lexer_types_1.TokenType.Agent:
                return this.parseObjectDeclaration();
            default:
                return this.parseExpression();
        }
    };
    Parser.prototype.parseObjectDeclaration = function () {
        var position = this.next().position;
        var identifier = this.expect(lexer_types_1.TokenType.Identifier, "Expected identifier after AGENT declaration").value;
        this.expect(lexer_types_1.TokenType.OpenBrace, "Expected open brace after AGENT declaration");
        var body = [];
        console.log(this.at().type);
        while (this.at().type !== lexer_types_1.TokenType.CloseBrace) {
            switch (this.at().type) {
                case lexer_types_1.TokenType.Variable:
                case lexer_types_1.TokenType.Const:
                case lexer_types_1.TokenType.Dynamic:
                    var declaration = this.parseVariableDeclaration();
                    body.push(declaration);
                default:
                    error_1.Error.parse(this.at().position, "Expected VARIABLE, CONST or DYNAMIC keywords");
            }
        }
        var objectDeclaration = {
            type: ast_types_1.NodeType.ObjectDeclaration,
            identifier: identifier,
            body: body,
            position: position
        };
        return objectDeclaration;
    };
    Parser.prototype.parseVariableDeclaration = function () {
        var position = this.at().position;
        var variableType = this.next().type;
        var identifier = this.expect(lexer_types_1.TokenType.Identifier, "Expected identifier in variable declaration").value;
        var defaultValue;
        if (variableType === lexer_types_1.TokenType.Variable) {
            this.expect(lexer_types_1.TokenType.Colon, "Expected a colon for default value in VARIABLE declaration");
            defaultValue = this.parseExpression();
        }
        this.expect(lexer_types_1.TokenType.Equals, "Expected equals sign after default value expression in VARIABLE declaration");
        var value = this.parseExpression();
        this.expect(lexer_types_1.TokenType.Semicolon, "Expected semicolon after variable declaration");
        function getVariableType() {
            if (variableType === lexer_types_1.TokenType.Variable) {
                return ast_types_1.VariableType.Variable;
            }
            else if (variableType === lexer_types_1.TokenType.Const) {
                return ast_types_1.VariableType.Const;
            }
            else {
                return ast_types_1.VariableType.Dynamic;
            }
        }
        var variableDeclaration = {
            type: ast_types_1.NodeType.VariableDeclaration,
            variableType: getVariableType(),
            identifier: identifier,
            default: defaultValue,
            value: value,
            position: position
        };
        return variableDeclaration;
    };
    Parser.prototype.parseExpression = function () {
        return this.parseAdditiveExpression();
    };
    Parser.prototype.parseAdditiveExpression = function () {
        var left = this.parseMultiplicativeExpression();
        while (this.at().value === "+" || this.at().value === "-") {
            var position = this.at().position;
            var operator = this.next().value;
            var right = this.parseMultiplicativeExpression();
            left = {
                type: ast_types_1.NodeType.BinaryExpression,
                left: left,
                right: right,
                operator: operator,
                position: position
            };
        }
        return left;
    };
    Parser.prototype.parseMultiplicativeExpression = function () {
        var left = this.parsePrimaryExpression();
        while (this.at().value === "*" || this.at().value === "/" || this.at().value === "%") {
            var position = this.at().position;
            var operator = this.next().value;
            var right = this.parsePrimaryExpression();
            left = {
                type: ast_types_1.NodeType.BinaryExpression,
                left: left,
                right: right,
                operator: operator,
                position: position
            };
        }
        return left;
    };
    Parser.prototype.parsePrimaryExpression = function () {
        var token = this.at();
        switch (token.type) {
            case lexer_types_1.TokenType.Identifier:
                return { type: ast_types_1.NodeType.Identifier, position: this.at().position, identifier: this.next().value };
            case lexer_types_1.TokenType.Number:
                return { type: ast_types_1.NodeType.NumericLiteral, position: this.at().position, value: parseFloat(this.next().value) };
            case lexer_types_1.TokenType.OpenParen:
                // skip the open parenthesis
                this.next();
                var value = this.parseExpression();
                // skip the close parenthesis
                this.expect(lexer_types_1.TokenType.CloseParen, "Expected a closing parenthesis, not found!");
                return value;
            default:
                error_1.Error.parse(this.at().position, "Unexpected token found during parsing: " + this.at().value);
                return {};
        }
    };
    Parser.prototype.at = function () {
        return this.tokens[0];
    };
    Parser.prototype.next = function () {
        var previous = this.tokens.shift();
        return previous;
    };
    Parser.prototype.expect = function (type, message) {
        var previous = this.next();
        if (!previous || previous.type !== type) {
            error_1.Error.parse(previous.position, message);
        }
        return previous;
    };
    Parser.prototype.notEndOfFile = function () {
        return this.tokens[0].type !== lexer_types_1.TokenType.EOF;
    };
    Parser.prototype.createEmptyProgram = function () {
        return { type: ast_types_1.NodeType.Program, body: [], position: { line: 1, character: 1 } };
    };
    return Parser;
}());
exports.Parser = Parser;
