import { expect } from "bun:test";
import { Lexer, Token } from "../lexer";
import { Parser, Program } from "../parser";
import { Symbolizer, Symbol } from "../symbolizer";

export function getTokens(sourceCode: string): Token[] {
    const symbolizer: Symbolizer = new Symbolizer(sourceCode);
    const symbols: Symbol[] = symbolizer.symbolize();

    const lexer: Lexer = new Lexer(symbols);
    const tokens: Token[] = lexer.tokenize();

    return tokens;
}

export function getProgram(sourceCode: string): Program {
    const symbolizer: Symbolizer = new Symbolizer(sourceCode);
    const symbols: Symbol[] = symbolizer.symbolize();

    const lexer: Lexer = new Lexer(symbols);
    const tokens: Token[] = lexer.tokenize();

    const parser: Parser = new Parser(tokens);
    const program: Program = parser.parse();

    return program;
}