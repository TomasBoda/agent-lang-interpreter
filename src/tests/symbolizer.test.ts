import { describe, test, expect, beforeEach } from "bun:test";
import { Symbol, Symbolizer } from "../symbolizer";

describe("Symbolizer", () => {
  let symbolizer: Symbolizer;

  beforeEach(() => {
    symbolizer = new Symbolizer("");
  });

  test("should create", () => {
    expect(symbolizer).toBeTruthy();
  });
  
  test("should return empty array of symbols from empty source code", () => {
    provideSourceCode("");
    const symbols: Symbol[] = symbolizer.symbolize();
    
    expect(symbols).toBeArray();
    expect(symbols).toBeEmpty();
  });

  test("should return non-empty array of symbols from non-empty source code", () => {
    const sourceCode = "agent person 5 {}";
    provideSourceCode(sourceCode);

    const symbols: Symbol[] = symbolizer.symbolize();

    expect(symbols).toBeArray();
    expect(symbols).not.toBeEmpty();

    expect(symbols.length).toBe(sourceCode.length);
  });

  test("should return correct symbols from source code", () => {
    const sourceCode = "agent person 5 {}";
    provideSourceCode(sourceCode);
    
    const symbols: Symbol[] = symbolizer.symbolize();
    const characters: string[] = sourceCode.split("");

    for (let i = 0; i < characters.length; i++) {
      const symbol: Symbol = symbols[i];
      const character: string = characters[i];

      expect(symbol.value).toBe(character);
      expect(symbol.position.character).toBe(i + 1);
    }
  });

  function provideSourceCode(code: string): void {
    symbolizer = new Symbolizer(code);
  }
});