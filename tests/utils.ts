import { Symbolizer, Symbol, Parser, Program, Lexer, Token } from "../src";

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