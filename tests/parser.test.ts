import { describe, expect, test } from "bun:test";
import { getProgram } from "./utils";
import { ObjectDeclaration, VariableDeclaration } from "../src";

describe("Parser", () => {
    
    test("should return empty program on empty source code", () => {
        const code = "";
        const program = getProgram(code);

        expect(program).toEqual({
            type: "Program",
            body: [],
            position: {
                line: 0,
                character: 0
            }
        });
    });

    test("should parse object declaration", () => {
        const code = "agent person 10 {}";
        const program = getProgram(code);
        expect(program.body).toHaveLength(1);
    });

    test("should parse multiple object declarations", () => {
        const code = "agent person 10 {} agent building 5 {}";
        const program = getProgram(code);
        expect(program.body).toHaveLength(2);
    });
});