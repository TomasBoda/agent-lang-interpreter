import { Symbolizer, Symbol, Parser, Program, Lexer, Token } from "../src";

export function getSymbols(sourceCode: string): Symbol[] {
    const symbolizer: Symbolizer = new Symbolizer(sourceCode);
    const symbols: Symbol[] = symbolizer.symbolize();

    return symbols;
}

export function getTokens(sourceCode: string): Token[] {
    const symbols: Symbol[] = getSymbols(sourceCode);

    const lexer: Lexer = new Lexer(symbols);
    const tokens: Token[] = lexer.tokenize();

    return tokens;
}

export function getProgram(sourceCode: string): Program {
    const tokens: Token[] = getTokens(sourceCode);

    const parser: Parser = new Parser(tokens);
    const program: Program = parser.parse();

    return program;
}