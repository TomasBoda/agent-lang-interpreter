"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = exports.ReservedKeywords = void 0;
var error_1 = require("../lib/error");
var lexer_types_1 = require("./lexer.types");
exports.ReservedKeywords = {
    "AGENT": lexer_types_1.TokenType.Agent,
    "VARIABLE": lexer_types_1.TokenType.Variable,
    "CONST": lexer_types_1.TokenType.Const,
    "DYNAMIC": lexer_types_1.TokenType.Dynamic,
    "IF": lexer_types_1.TokenType.If,
    "THEN": lexer_types_1.TokenType.Then,
    "ELSE": lexer_types_1.TokenType.Else,
    "AND": lexer_types_1.TokenType.And,
    "OR": lexer_types_1.TokenType.Or,
    "AS": lexer_types_1.TokenType.As
};
var Lexer = /** @class */ (function () {
    function Lexer(sourceCode) {
        this.symbols = [];
        this.tokens = [];
        this.sourceCode = sourceCode;
    }
    Lexer.prototype.tokenize = function () {
        this.symbols = [];
        this.tokens = [];
        this.generateSourceCodeSymbols();
        while (this.hasNext()) {
            if (this.isNext("(")) {
                this.token(lexer_types_1.TokenType.OpenParen);
            }
            else if (this.isNext(")")) {
                this.token(lexer_types_1.TokenType.CloseParen);
            }
            else if (this.isNext("{")) {
                this.token(lexer_types_1.TokenType.OpenBrace);
            }
            else if (this.isNext("}")) {
                this.token(lexer_types_1.TokenType.CloseBrace);
            }
            else if (this.isNext("+")) {
                this.token(lexer_types_1.TokenType.BinaryOperator);
            }
            else if (this.isNext("-")) {
                this.token(lexer_types_1.TokenType.BinaryOperator);
            }
            else if (this.isNext("*")) {
                this.token(lexer_types_1.TokenType.BinaryOperator);
            }
            else if (this.isNext("/")) {
                this.token(lexer_types_1.TokenType.BinaryOperator);
            }
            else if (this.isNext("%")) {
                this.token(lexer_types_1.TokenType.BinaryOperator);
            }
            else if (this.isNext("=")) {
                this.token(lexer_types_1.TokenType.Equals);
            }
            else if (this.isNext(",")) {
                this.token(lexer_types_1.TokenType.Comma);
            }
            else if (this.isNext(".")) {
                this.token(lexer_types_1.TokenType.Dot);
            }
            else if (this.isNext(":")) {
                this.token(lexer_types_1.TokenType.Colon);
            }
            else if (this.isNext(";")) {
                this.token(lexer_types_1.TokenType.Semicolon);
            }
            else {
                var position = this.getNext().position;
                // decimal numbers
                if (this.isNumber()) {
                    var number = "";
                    var foundDecimalPoint = false;
                    while (this.hasNext() && (this.isNumber() || (this.isNext(".")))) {
                        if (this.isNext(".")) {
                            if (foundDecimalPoint) {
                                error_1.Error.lex(position, "Number cannot contain more than one decimal point");
                            }
                            foundDecimalPoint = true;
                        }
                        number += this.next().value;
                    }
                    this.token(lexer_types_1.TokenType.Number, { value: number, position: position });
                    // identifiers
                }
                else if (this.isAlpha()) {
                    var identifier = "";
                    while (this.hasNext() && this.isAlpha()) {
                        identifier += this.next().value;
                    }
                    this.token(this.getIdentifierTokenType(identifier), { value: identifier, position: position });
                }
                else if (this.isSkippable()) {
                    this.next();
                }
                else {
                    error_1.Error.lex(position, "Unrecognized character found in source: " + this.getNext().value);
                }
            }
        }
        this.generateEOFToken();
        return this.tokens;
    };
    Lexer.prototype.generateSourceCodeSymbols = function () {
        var lineNumber = 1;
        var charNumber = 1;
        for (var _i = 0, _a = this.sourceCode.split(""); _i < _a.length; _i++) {
            var character = _a[_i];
            this.symbol(character, lineNumber, charNumber);
            charNumber++;
            if (character === "\n") {
                lineNumber++;
                charNumber = 1;
            }
        }
    };
    Lexer.prototype.getIdentifierTokenType = function (identifier) {
        var keyword = exports.ReservedKeywords[identifier];
        return keyword ? keyword : lexer_types_1.TokenType.Identifier;
    };
    Lexer.prototype.hasNext = function () {
        return this.symbols.length > 0;
    };
    Lexer.prototype.getNext = function () {
        return this.symbols[0];
    };
    Lexer.prototype.isNext = function (symbol) {
        return symbol === this.getNext().value;
    };
    Lexer.prototype.next = function () {
        var _a;
        return (_a = this.symbols.shift()) !== null && _a !== void 0 ? _a : {};
    };
    Lexer.prototype.token = function (type, symbol) {
        if (symbol === void 0) { symbol = this.next(); }
        this.tokens.push({ type: type, value: symbol.value, position: symbol.position });
    };
    Lexer.prototype.symbol = function (value, line, character) {
        this.symbols.push({ value: value, position: { line: line, character: character } });
    };
    Lexer.prototype.generateEOFToken = function () {
        if (this.tokens.length === 0) {
            this.token(lexer_types_1.TokenType.EOF, { value: "EOF", position: { line: 1, character: 1 } });
            return;
        }
        var lastPosition = this.tokens[this.tokens.length - 1].position;
        var eofPosition = __assign(__assign({}, lastPosition), { character: lastPosition.character + 1 });
        this.token(lexer_types_1.TokenType.EOF, { value: "EOF", position: eofPosition });
    };
    Lexer.prototype.isAlpha = function () {
        return this.getNext().value.toUpperCase() != this.getNext().value.toLowerCase();
    };
    Lexer.prototype.isNumber = function () {
        var symbol = this.getNext().value.charCodeAt(0);
        var bounds = { lower: "0".charCodeAt(0), upper: "9".charCodeAt(0) };
        return symbol >= bounds.lower && symbol <= bounds.upper;
    };
    Lexer.prototype.isSkippable = function () {
        return this.getNext().value === " " || this.getNext().value === "\n" || this.getNext().value === "\t";
    };
    return Lexer;
}());
exports.Lexer = Lexer;
