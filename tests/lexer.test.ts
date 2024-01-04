import { describe, test, expect } from "bun:test";
import { getTokens } from "./utils";
import { TokenType } from "../src";

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

    test("should return non-empty array of tokens from non-empty source code", () => {
        const code = "agent person 10 {}";
        const tokens = getTokens(code);

        expect(tokens.length).toBe(6);
    });

    test("should return correct tokens from non-empty source code", () => {
        const code = "agent person 10 {}";
        const tokens = getTokens(code);

        expect(tokens[0].type).toEqual(TokenType.Agent);
        expect(tokens[1].type).toEqual(TokenType.Identifier);
        expect(tokens[2].type).toEqual(TokenType.Number);
        expect(tokens[3].type).toEqual(TokenType.OpenBrace);
        expect(tokens[4].type).toEqual(TokenType.CloseBrace);
        expect(tokens[5].type).toEqual(TokenType.EOF);
    });

    test("should throw error on unrecognized lexer token", () => {
        const code = "agent person 10 { const value = @; }";

        expect(() => getTokens(code))
            .toThrow("Unrecognized character found in source: @");
    });

    test("should throw error on more than one decimal point in numeric literal", () => {
        const code = "agent person 10 { const value = 1.2.3; }";

        expect(() => getTokens(code))
            .toThrow("Number cannot contain more than one decimal point");
    });
});