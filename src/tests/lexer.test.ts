import { describe, test, expect, beforeEach } from "bun:test";
import { Lexer } from "../lexer/lexer";
import { Symbolizer } from "../symbolizer/symbolizer";
import { LexerOutput, Token, TokenType } from "../lexer/lexer.types";
import { ExitStatus } from "../interpreter/interpreter.types";

describe("Lexer", () => {
    let symbolizer: Symbolizer;
    let lexer: Lexer;

    let status: ExitStatus;
    let tokens: Token[] | undefined;

    beforeEach(() => {
        provideSourceCode("");
    });

    test("should create", () => {
        expect(lexer).toBeTruthy();
    });
    
    test("should return only EOF token from empty source code", () => {
        expect(tokens).toBeDefined();
        expect(tokens).toBeArray();
        expect(tokens?.length).toBe(1);
        expect(tokens?.[0]).toEqual({ type: TokenType.EOF, value: "EOF", position: { line: 1, character: 1 } });
    });

    test("should return non-empty array of tokens from non-empty source code", () => {
        provideSourceCode("agent person 10 {}");

        expect(tokens).toBeDefined();
        expect(tokens).toBeArray();
        expect(tokens?.length).toBe(6);

        expect(tokens?.[0]).toEqual({ type: TokenType.Agent, value: "agent", position: { line: 1, character: 1 } });
        expect(tokens?.[1]).toEqual({ type: TokenType.Identifier, value: "person", position: { line: 1, character: 7 } });
        expect(tokens?.[2]).toEqual({ type: TokenType.Number, value: "10", position: { line: 1, character: 14 } });
        expect(tokens?.[3]).toEqual({ type: TokenType.OpenBrace, value: "{", position: { line: 1, character: 17 } });
        expect(tokens?.[4]).toEqual({ type: TokenType.CloseBrace, value: "}", position: { line: 1, character: 18 } });
        expect(tokens?.[5]).toEqual({ type: TokenType.EOF, value: "EOF", position: { line: 1, character: 19 } });
    });

    test("should return error when number contains more than one decimal points", () => {
        provideSourceCode("agent person 10 { const age = 1.2.3; }");

        const { code, message } = status;

        expect(tokens).toBeUndefined();
        expect(code).toBe(1);
        expect(message).toContain("Number cannot contain more than one decimal point");
    });

    test("should return error with undentified character in source code", () => {
        provideSourceCode("agent person 10 { const age = @; }");

        const { code, message } = status;

        expect(tokens).toBeUndefined();
        expect(code).toBe(1);
        expect(message).toContain("Unrecognized character found in source: @");
    });

    function provideSourceCode(code: string): void {
        symbolizer = new Symbolizer(code);
        lexer = new Lexer(symbolizer.symbolize());
        const lexerOutput = lexer.tokenize();
        status = lexerOutput.status;
        tokens = lexerOutput.tokens;
    }
});