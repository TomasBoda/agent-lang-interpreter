import { describe, expect, test } from "bun:test";
import { getOutput, getProgram } from "./utils";
import { BooleanValue, NumberValue, ValueType } from "../src";
import { TestSupport } from "./test-support";

interface ExpressionTestingData {
    expression: string;
    result: number | boolean;
    type: ValueType;
}

const BINARY_EXPRESSION_TESTING_DATA: ExpressionTestingData[] = [
    { expression: "6 + 3", result: 6 + 3, type: ValueType.Number },
    { expression: "6 - 3", result: 6 - 3, type: ValueType.Number },
    { expression: "6 * 3", result: 6 * 3, type: ValueType.Number },
    { expression: "6 / 3", result: 6 / 3, type: ValueType.Number },
    { expression: "6 % 3", result: 6 % 3, type: ValueType.Number },
    { expression: "6 == 3", result: false, type: ValueType.Boolean },
    { expression: "6 != 3", result: true, type: ValueType.Boolean },
    { expression: "6 < 3", result: 6 < 3, type: ValueType.Boolean },
    { expression: "6 <= 3", result: 6 <= 3, type: ValueType.Boolean },
    { expression: "6 > 3", result: 6 > 3, type: ValueType.Boolean },
    { expression: "6 >= 3", result: 6 >= 3, type: ValueType.Boolean },

    { expression: "2 + 3 * 4", result: 2 + 3 * 4, type: ValueType.Number },
    { expression: "(2 + 3 * 4)", result: 2 + 3 * 4, type: ValueType.Number },
    { expression: "(((2 + 3 * 4)))", result: 2 + 3 * 4, type: ValueType.Number },
    { expression: "2 + (3 * 4)", result: 2 + (3 * 4), type: ValueType.Number },
    { expression: "(2 + 3) * 4", result: (2 + 3) * 4, type: ValueType.Number },
    { expression: "2 * 3 + 4", result: 2 * 3 + 4, type: ValueType.Number },
    { expression: "(2 * 3) + 4", result: (2 * 3) + 4, type: ValueType.Number },
    { expression: "2 * (3 + 4)", result: 2 * (3 + 4), type: ValueType.Number },
];

const UNARY_EXPRESSION_TESTING_DATA: ExpressionTestingData[] = [
    { expression: "-3", result: -3, type: ValueType.Number },
    { expression: "-12.94", result: -12.94, type: ValueType.Number },
    { expression: "-(-3)", result: -(-3), type: ValueType.Number },
    { expression: "-(-(-(-3)))", result: -(-(-(-3))), type: ValueType.Number },
    { expression: "!true", result: !true, type: ValueType.Boolean },
    { expression: "!false", result: !false, type: ValueType.Boolean },
    { expression: "!(!true)", result: !(!true), type: ValueType.Boolean },
    { expression: "!!!true", result: !(!(!true)), type: ValueType.Boolean },
];

const LOGICAL_EXPRESSION_TESTING_DATA: ExpressionTestingData[] = [
    { expression: "true and true", result: true && true, type: ValueType.Boolean },
    { expression: "true and false", result: true && false, type: ValueType.Boolean },
    { expression: "false and true", result: false && true, type: ValueType.Boolean },
    { expression: "false and false", result: false && false, type: ValueType.Boolean },
    { expression: "true or true", result: true || true, type: ValueType.Boolean },
    { expression: "true or false", result: true || false, type: ValueType.Boolean },
    { expression: "false or true", result: false || true, type: ValueType.Boolean },
    { expression: "false or false", result: false || false, type: ValueType.Boolean },
];

const CONDITIONAL_EXPRESSION_TESTING_DATA: ExpressionTestingData[] = [
    { expression: "if true then true else true", result: true ? true : true, type: ValueType.Boolean },
    { expression: "if true then true else false", result: true ? true : false, type: ValueType.Boolean },
    { expression: "if true then false else true", result: true ? false : true, type: ValueType.Boolean },
    { expression: "if false then true else true", result: false ? true : true, type: ValueType.Boolean },
    { expression: "if true then false else false", result: true ? false : false, type: ValueType.Boolean },
    { expression: "if false then false else true", result: false ? false : true, type: ValueType.Boolean },
    { expression: "if false then false else false", result: false ? false : false, type: ValueType.Boolean },
];

function testExpression(entry: ExpressionTestingData) {
    const { expression, result, type } = entry;

    const code = `agent person 1 { const value = ${expression}; }`;
    const output = getOutput(code);

    expect(output.agents.length).toBe(1);

    const agent = output.agents[0];

    switch (type) {
        case ValueType.Number: {
            const value = TestSupport.expectValue<NumberValue>(agent.variables.get("value"), ValueType.Number);
            expect(value.value).toBe(result);
            break;
        }
        case ValueType.Boolean: {
            const value = TestSupport.expectValue<BooleanValue>(agent.variables.get("value"), ValueType.Boolean);
            expect(value.value).toBe(result);
            break;
        }
    }
}

describe("Runtime", () => {

    test.each(BINARY_EXPRESSION_TESTING_DATA)
    ("should correctly evaluate binary expression (%#)", entry => {
        testExpression(entry);
    });

    test.each(UNARY_EXPRESSION_TESTING_DATA)
    ("should correctly evaluate unary expression (%#)", entry => {
        testExpression(entry);
    });

    test.each(LOGICAL_EXPRESSION_TESTING_DATA)
    ("should correctly evaluate logical expression (%#)", entry => {
        testExpression(entry);
    });

    test.each(CONDITIONAL_EXPRESSION_TESTING_DATA)
    ("should correctly evaluate conditional expression (%#)", entry => {
        testExpression(entry);
    });
    
    test("should correctly evaluate index() and step() global functions", () => {
        const code = "agent person 20 { const i = index(); property s = step(); }";
        const output = getOutput(code);

        expect(output.agents.length).toBe(20);

        for (let i = 0; i < 20; i++) {
            const agent = output.agents[i];

            expect(agent.identifier).toBe("person");
            expect(agent.id).toBe(`person-${i}`);

            const index = TestSupport.expectValue<NumberValue>(agent.variables.get("i"), ValueType.Number);
            const step = TestSupport.expectValue<NumberValue>(agent.variables.get("s"), ValueType.Number);

            expect(index.value).toBe(i);
            expect(step.value).toBe(1);
        }
    });
});