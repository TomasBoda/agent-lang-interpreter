import { Symbolizer, Symbol, Parser, Program, Lexer, Token, RuntimeOutput, Runtime, Environment } from "../src";

/**
 * Returns array of symbols from the source code
 * 
 * @param sourceCode source code of the simulation
 * @returns array of symbols
 */
export function getSymbols(sourceCode: string): Symbol[] {
    const symbolizer: Symbolizer = new Symbolizer(sourceCode);
    const symbols: Symbol[] = symbolizer.symbolize();

    return symbols;
}

/**
 * Returns array of tokens from the source code
 * 
 * @param sourceCode source code of the simulation
 * @returns array of tokens
 */
export function getTokens(sourceCode: string): Token[] {
    const symbols: Symbol[] = getSymbols(sourceCode);

    const lexer: Lexer = new Lexer(symbols);
    const tokens: Token[] = lexer.tokenize();

    return tokens;
}

/**
 * Returns parsed abstract syntax tree from the source code
 * 
 * @param sourceCode source code of the simulation
 * @returns abstract syntax tree
 */
export function getProgram(sourceCode: string): Program {
    const tokens: Token[] = getTokens(sourceCode);

    const parser: Parser = new Parser(tokens);
    const program: Program = parser.parse();

    return program;
}

/**
 * Returns the evaluation of the first step of the simulation from the source code
 * 
 * @param sourceCode source code of the simulation
 * @returns evaluation of the first step of the simulation
 */
export function getOutput(sourceCode: string): RuntimeOutput {
    const program = getProgram(sourceCode);

    const runtime: Runtime = new Runtime(program, new Environment());
    runtime.run(0);
    const output = runtime.run(1);

    return output;
}