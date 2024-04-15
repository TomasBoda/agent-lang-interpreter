import { expect } from "bun:test";
import { Symbolizer, Symbol, Parser, Program, Lexer, Token, DefineDeclaration, ParserValue, NodeType, ObjectDeclaration, VariableDeclaration, RuntimeOutput, Runtime, Environment } from "../src";

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

export function getOutput(sourceCode: string): RuntimeOutput {
    const program = getProgram(sourceCode);

    const runtime: Runtime = new Runtime(program, new Environment());
    runtime.run(0);
    const output = runtime.run(1);

    return output;
}