import { describe, test, expect } from "bun:test";
import { getTokens } from "./utils";
import { TokenType } from "../lexer";

describe("Lexer", () => {
    
    test("should return EOF as only token on empty source code", () => {
        const tokens = getTokens("");

        expect(tokens.length).toBe(1);
        expect(tokens[0]).toEqual({ type: TokenType.EOF, value: "EOF", position: { line: 1, character: 1 } });
    });

    test("should return EOF as last token on non-empty source code", () => {
        const tokens = getTokens("agent person 10 {}");

        expect(tokens.length).toBe(6);
        expect(tokens[tokens.length - 1]).toEqual({ type: TokenType.EOF, value: "EOF", position: { line: 1, character: 19 } });
    });

    test("should return non-empty array of tokens from non-empty source code", () => {
        const tokens = getTokens("agent person 10 {}");

        expect(tokens.length).toBe(6);

        expect(tokens[0].type).toEqual(TokenType.Agent);
        expect(tokens[1].type).toEqual(TokenType.Identifier);
        expect(tokens[2].type).toEqual(TokenType.Number);
        expect(tokens[3].type).toEqual(TokenType.OpenBrace);
        expect(tokens[4].type).toEqual(TokenType.CloseBrace);
        expect(tokens[5].type).toEqual(TokenType.EOF);
    });
});