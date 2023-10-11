import { describe, test, expect, beforeEach } from "bun:test";
import { Lexer } from "../lexer/lexer";
import { Symbolizer } from "../symbolizer/symbolizer";
import { Parser } from "../parser/parser";
import { NodeType, ObjectDeclaration, ParserValue, Program, VariableDeclaration, VariableType } from "../parser/parser.types";

describe("Lexer", () => {
    let symbolizer: Symbolizer;
    let lexer: Lexer;
    let parser: Parser;

    let output: ParserValue;

    beforeEach(() => {
        provideSourceCode("");
    });

    test("should create", () => {
        expect(parser).toBeTruthy();
        expect(2).toBe(1);
    });

    test("should parse empty source code", () => {
        const program = getProgram();

        expect(program.body).toBeArray();
        expect(program.body).toHaveLength(0);
    });

    test("should parse object declarations", () => {
        provideSourceCode("agent a 1 {}\nagent b 2 {}\n agent c 3 {}");
        const identifiers: string[] = ["a", "b", "c"];

        const program: Program = getProgram();
        expect(program.body).toHaveLength(3);

        for (let i = 0; i < 3; i++) {
            const node: ParserValue = program.body[i];
            expect(node.type).toBe(NodeType.ObjectDeclaration);

            const objectDeclaration: ObjectDeclaration = node as ObjectDeclaration;

            expect(objectDeclaration.identifier).toBe(identifiers[i]);
            expect(objectDeclaration.count).toBe(i + 1);
            expect(objectDeclaration.body).toHaveLength(0);
        }
    });

    test("should parse variable declarations", () => {
        provideSourceCode("agent a 1 { const age = 10; dynamic alive = false; variable position: 0 = random(0, 100); }");

        const program: Program = getProgram();
        expect(program.body).toHaveLength(1);

        const node: ParserValue = program.body[0];
        expect(node.type).toBe(NodeType.ObjectDeclaration);
        const objectDeclaration: ObjectDeclaration = node as ObjectDeclaration;

        expect(objectDeclaration.body).toHaveLength(3);

        for (const node of objectDeclaration.body) {
            expect(node.type).toBe(NodeType.VariableDeclaration);
        }

        const constDeclaration = objectDeclaration.body[0] as VariableDeclaration;
        expect(constDeclaration.variableType).toBe(VariableType.Const);
        expect(constDeclaration.identifier).toBe("age");
        expect(constDeclaration.value).toEqual({ type: NodeType.NumericLiteral, value: 10 });

        const dynamicDeclaration = objectDeclaration.body[1] as VariableDeclaration;
        expect(dynamicDeclaration.variableType).toBe(VariableType.Dynamic);
        expect(dynamicDeclaration.identifier).toBe("alive");
        expect(dynamicDeclaration.value).toEqual({ type: NodeType.BooleanLiteral, value: false });

        const variableDeclaration = objectDeclaration.body[2] as VariableDeclaration;
        expect(variableDeclaration.variableType).toBe(VariableType.Variable);
        expect(variableDeclaration.identifier).toBe("position");
        expect(variableDeclaration.value.type).toBe(NodeType.CallExpression);
    });

    function expectProgramToBeDefined(): void {
        expect(output).toBeDefined();
        expect(output.type).toBe("Program");
    }

    function getProgram(): Program {
        expectProgramToBeDefined();
        return output as Program;
    }

    function provideSourceCode(code: string): void {
        symbolizer = new Symbolizer(code);
        lexer = new Lexer(symbolizer.symbolize());
        const lexerOutput = lexer.tokenize();
        parser = new Parser(lexerOutput.tokens ?? []);
        output = parser.parse();
    }
});