import { describe, test, expect } from "bun:test";
import { getTokens } from "./utils";
import { ErrorLexer, ErrorModel, TokenType } from "../src";

describe("Lexer", () => {
    
    test("should return EOF as only token on empty source code", () => {
        const code = "";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(1);
        expect(tokens[0]).toEqual({ type: TokenType.EOF, value: "EOF", position: { line: 1, character: 1 } });
    });

    test("should return EOF as last token on non-empty source code", () => {
        const code = "agent person 10 {}";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(6);
        expect(tokens[tokens.length - 1]).toEqual({ type: TokenType.EOF, value: "EOF", position: { line: 1, character: 19 } });
    });

    test("should return non-empty array of tokens for non-empty source code", () => {
        const code = "agent person 10 {}";
        const tokens = getTokens(code);

        expect(tokens.length).not.toBe(0);
    });

    test("should correctly tokenize agent declaration", () => {
        const code = "agent person 10 {}";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(6);

        expect(tokens[0].type).toBe(TokenType.Agent);
        expect(tokens[1].type).toBe(TokenType.Identifier);
        expect(tokens[2].type).toBe(TokenType.Number);
        expect(tokens[3].type).toBe(TokenType.OpenBrace);
        expect(tokens[4].type).toBe(TokenType.CloseBrace);
    });

    test("should correctly tokenize property declaration", () => {
        const code = "agent person 10 { property age: 10 = age + 1; }";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(15);

        expect(tokens[4].type).toBe(TokenType.Property);
        expect(tokens[5].type).toBe(TokenType.Identifier);
    });

    test("should correctly tokenize const declaration", () => {
        const code = "agent person 10 { const age = round(random(10, 30)); }";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(19);

        expect(tokens[4].type).toBe(TokenType.Const);
        expect(tokens[5].type).toBe(TokenType.Identifier);
    });

    test("should correctly tokenize define declaration", () => {
        const code = "define speed = 5; agent person 10 {}";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(11);

        expect(tokens[0].type).toBe(TokenType.Define);
        expect(tokens[1].type).toBe(TokenType.Identifier);
    });

    test("should correcly tokenize integer number", () => {
        const code = "define speed = 5;";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(6);

        expect(tokens[3].type).toBe(TokenType.Number);
        expect(tokens[4].type).toBe(TokenType.Semicolon);
    });

    test("should correcly tokenize decimal number", () => {
        const code = "define speed = 2.5;";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(6);

        expect(tokens[3].type).toBe(TokenType.Number);
        expect(tokens[4].type).toBe(TokenType.Semicolon);
    });

    test("should correctly tokenize true boolean", () => {
        const code = "define debug = true;";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(6);

        expect(tokens[3].type).toBe(TokenType.Boolean);
        expect(tokens[4].type).toBe(TokenType.Semicolon);
    });

    test("should correctly tokenize false boolean", () => {
        const code = "define debug = false;";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(6);

        expect(tokens[3].type).toBe(TokenType.Boolean);
        expect(tokens[4].type).toBe(TokenType.Semicolon);
    });

    test("should throw error on unrecognized lexer token", () => {
        const code = "agent person 10 { const value = @; }";
        expect(() => getTokens(code)).toThrow(ErrorLexer);
    });

    test("should throw error on more than one decimal point in numeric literal", () => {
        const code = "agent person 10 { const value = 1.2.3; }";

        expect(() => getTokens(code)).toThrow(ErrorLexer);
    });
});