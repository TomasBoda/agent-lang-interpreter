import { describe, expect, test } from "bun:test";
import { getProgram } from "./utils";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, DefineDeclaration, ErrorParser, Identifier, LogicalExpression, MemberExpression, Node, NodeType, NumericLiteral, ObjectDeclaration, OtherwiseExpression, SetComprehensionExpression, UnaryExpression, VariableDeclaration, VariableType } from "../src";
import { TestSupport } from "./test-support";

describe("Parser", () => {
    
    test("should return empty program on empty source code", () => {
        const code = "";
        const program = getProgram(code);

        expect(program.body.length).toBe(0);
    });

    test("should parse agent declaration with numeric count", () => {
        const code = "agent person 10 {}";
        const program = getProgram(code);
        expect(program.body).toHaveLength(1);

        const objectDeclaration = TestSupport.expectAgentDeclaration(program, "person");
        const { body, count } = objectDeclaration;
        expect(body.length).toBe(0);
        
        const agentCount = TestSupport.expectNode<NumericLiteral>(count, NodeType.NumericLiteral);
        expect(agentCount.value).toBe(10);
    });

    test("should parse agent declaration with identifier count", () => {
        const code = "define person_count = 10; agent person person_count {}";
        const program = getProgram(code);

        expect(program.body).toHaveLength(2);
        expect(program.body[1].type).toBe(NodeType.ObjectDeclaration);

        const objectDeclaration = TestSupport.expectAgentDeclaration(program, "person");
        const { body, count } = objectDeclaration;
        expect(body.length).toBe(0);
        
        const agentCount = TestSupport.expectNode<Identifier>(count, NodeType.Identifier);
        expect(agentCount.identifier).toBe("person_count");
    });

    test("should parse multiple object declarations", () => {
        const code = "agent person 10 {} agent building 5 {}";
        const program = getProgram(code);
        expect(program.body).toHaveLength(2);

        const agentDeclaration1 = TestSupport.expectAgentDeclaration(program, "person");
        TestSupport.expectNode<NumericLiteral>(agentDeclaration1.count, NodeType.NumericLiteral);
        expect(agentDeclaration1.body.length).toBe(0);

        const agentDeclaration2 = TestSupport.expectAgentDeclaration(program, "building");
        TestSupport.expectNode<NumericLiteral>(agentDeclaration2.count, NodeType.NumericLiteral);
        expect(agentDeclaration2.body.length).toBe(0);
    });

    test("should parse property declaration with default value", () => {
        const code = "agent person 10 { property age: 0 = age + 1; }";
        const program = getProgram(code);
        expect(program.body).toHaveLength(1);
        
        const objectDeclaration = TestSupport.expectAgentDeclaration(program, "person");
        expect(objectDeclaration.body.length).toBe(1);

        const propertyDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "age");
        expect(propertyDeclaration.variableType).toBe(VariableType.Property);
        expect(propertyDeclaration.value.type).toBe(NodeType.BinaryExpression);
        expect(propertyDeclaration.default).toBeDefined();
        expect(propertyDeclaration.default!.type).toBe(NodeType.NumericLiteral);
    });

    test("should parse property declaration without default value", () => {
        const code = "agent person 10 { property age = 20; }";
        const program = getProgram(code);
        expect(program.body).toHaveLength(1);
        
        const objectDeclaration = TestSupport.expectAgentDeclaration(program, "person");
        expect(objectDeclaration.body.length).toBe(1);

        const propertyDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "age");
        expect(propertyDeclaration.variableType).toBe(VariableType.Property);
        expect(propertyDeclaration.default).toBeUndefined();
        TestSupport.expectNode<NumericLiteral>(propertyDeclaration.value, NodeType.NumericLiteral);
    });

    test("should parse const declaration", () => {
        const code = "agent person 10 { const age = 20; }";
        const program = getProgram(code);
        expect(program.body).toHaveLength(1);
        
        const objectDeclaration = TestSupport.expectAgentDeclaration(program, "person");
        expect(objectDeclaration.body.length).toBe(1);

        const propertyDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "age");
        expect(propertyDeclaration.variableType).toBe(VariableType.Const);
        TestSupport.expectNode<NumericLiteral>(propertyDeclaration.value, NodeType.NumericLiteral);
    });

    test("should parse define declaration", () => {
        const code = "define debug = false;";
        const program = getProgram(code);
        expect(program.body.length).toBe(1);

        const defineDeclaration = TestSupport.expectDefineDeclaration(program, "debug");
        TestSupport.expectNode<BooleanLiteral>(defineDeclaration.value, NodeType.BooleanLiteral);
    });

    test.each([
        "+", "-", "*", "/", "%", "==", "!=", "<=", "<", ">=", ">"
    ])("should parse binary expression with operator %s (%#)", operator => {
        const code = `agent person 10 { const age = 10 ${operator} 2; }`;
        const program = getProgram(code);

        const constDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "age");
        const binaryExpression = TestSupport.expectNode<BinaryExpression>(constDeclaration.value, NodeType.BinaryExpression);

        expect(binaryExpression.operator).toBe(operator);

        const left = TestSupport.expectNode<NumericLiteral>(binaryExpression.left, NodeType.NumericLiteral);
        expect(left.value).toBe(10);

        const right = TestSupport.expectNode<NumericLiteral>(binaryExpression.right, NodeType.NumericLiteral);
        expect(right.value).toBe(2);
    });

    test.each([
        { operator: "!", value: "true", type: NodeType.BooleanLiteral },
        { operator: "-", value: "10", type: NodeType.NumericLiteral }
    ])("should parse unary expression (%#)", entry => {
        const { operator, value, type } = entry;

        const code = `agent person 10 { const value = ${operator}${value}; }`;
        const program = getProgram(code);

        const constDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "value");
        const unaryExpression = TestSupport.expectNode<UnaryExpression>(constDeclaration.value, NodeType.UnaryExpression);

        expect(unaryExpression.operator).toBe(operator);
        expect(unaryExpression.value.type).toBe(type);
    });

    test.each([
        { expression: "true and false", operator: "and", leftType: NodeType.BooleanLiteral, rightType: NodeType.BooleanLiteral },
        { expression: "true or false", operator: "or", leftType: NodeType.BooleanLiteral, rightType: NodeType.BooleanLiteral },
        { expression: "true and false or false", operator: "or", leftType: NodeType.LogicalExpression, rightType: NodeType.BooleanLiteral },
        { expression: "true and (false or false)", operator: "and", leftType: NodeType.BooleanLiteral, rightType: NodeType.LogicalExpression },
        { expression: "10 > 5 and true", operator: "and", leftType: NodeType.BinaryExpression, rightType: NodeType.BooleanLiteral },
        { expression: "true and 10 > 5", operator: "and", leftType: NodeType.BooleanLiteral, rightType: NodeType.BinaryExpression }
    ])("should parse logical expression (%#)", entry => {
        const { expression , operator, leftType, rightType } = entry;

        const code = `agent person 10 { const value = ${expression}; }`;
        const program = getProgram(code);

        const constDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "value");
        const logicalExpression = TestSupport.expectNode<LogicalExpression>(constDeclaration.value, NodeType.LogicalExpression);

        expect(logicalExpression.operator).toBe(operator);
        expect(logicalExpression.left.type).toBe(leftType);
        expect(logicalExpression.right.type).toBe(rightType);
    });

    test.each([
        { expression: "if true then 1 else 2", consequentType: NodeType.NumericLiteral, alternateType: NodeType.NumericLiteral },
        { expression: "if false then 1 else 2", consequentType: NodeType.NumericLiteral, alternateType: NodeType.NumericLiteral },
        { expression: "if true then if true then 1 else 2 else 3", consequentType: NodeType.ConditionalExpression, alternateType: NodeType.NumericLiteral },
        { expression: "if true then 1 else if true then 2 else 3", consequentType: NodeType.NumericLiteral, alternateType: NodeType.ConditionalExpression },
    ])("should parse conditional expression (%#)", entry => {
        const { expression, consequentType, alternateType } = entry;

        const code = `agent person 10 { const value = ${expression}; }`;
        const program = getProgram(code);

        const constDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "value");
        const conditionalExpression = TestSupport.expectNode<ConditionalExpression>(constDeclaration.value, NodeType.ConditionalExpression);

        TestSupport.expectNode<BooleanLiteral>(conditionalExpression.condition, NodeType.BooleanLiteral);
        expect(conditionalExpression.consequent.type).toBe(consequentType);
        expect(conditionalExpression.alternate.type).toBe(alternateType);
    });

    test.each([
        { expression: "random(10, 5)", argTypes: [ NodeType.NumericLiteral, NodeType.NumericLiteral ] },
        { expression: "random(random(0, 5), 10)", argTypes: [ NodeType.CallExpression, NodeType.NumericLiteral ] }
    ])("should parse call expression (%#)", entry => {
        const { expression, argTypes } = entry;

        const code = `agent person 10 { const value = ${expression}; }`;
        const program = getProgram(code);

        const constDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "value");
        const callExpression = TestSupport.expectNode<CallExpression>(constDeclaration.value, NodeType.CallExpression);

        expect(callExpression.args.length).toBe(argTypes.length);
        for (let i = 0; i < callExpression.args.length; i++) {
            expect(callExpression.args[i].type).toBe(argTypes[i]);
        }
    });

    test.each([
        { expression: "filter(agents(person) | a -> p.age > 5)", paramName: "a", valueType: NodeType.BinaryExpression },
        { expression: "min(agents(person) | b -> p.age)", paramName: "b", valueType: NodeType.MemberExpression },
        { expression: "max(agents(person) | c -> p.age)", paramName: "c", valueType: NodeType.MemberExpression },
        { expression: "sum(agents(person) | d -> p.age)", paramName: "d", valueType: NodeType.MemberExpression }
    ])("should parse set comprehension expression (%#)", entry => {
        const { expression, paramName, valueType } = entry;

        const code = `agent person 10 { const age = round(random(0, 30)); property value = ${expression}; }`;
        const program = getProgram(code);

        const propertyDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "value");
        const callExpression = TestSupport.expectNode<CallExpression>(propertyDeclaration.value, NodeType.CallExpression);

        expect(callExpression.args.length).toBe(1);

        const setComprehensionExpression = TestSupport.expectNode<SetComprehensionExpression>(callExpression.args[0], NodeType.SetComprehensionExpression);

        TestSupport.expectNode<CallExpression>(setComprehensionExpression.base, NodeType.CallExpression);
        expect(setComprehensionExpression.param).toBe(paramName);
        expect(setComprehensionExpression.value.type).toBe(valueType);
    });

    test.each([
        { expression: "youngest.a" },
        { expression: "youngest.b" },
        { expression: "youngest.c" },
    ])("should parse member expression (%#)", entry => {
        const { expression } = entry;

        const code = `
            agent person 10 {
                const a = 1;
                const b = true;
                const c = index();

                const age = random(0, 30);
                property youngest = min(agents(person) | p -> p.age);

                property value = ${expression};
            }
        `;
        const program = getProgram(code);

        const propertyDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "value");
        const memberExpression = TestSupport.expectNode<MemberExpression>(propertyDeclaration.value, NodeType.MemberExpression);

        TestSupport.expectNode<Identifier>(memberExpression.caller, NodeType.Identifier);
        TestSupport.expectNode<Identifier>(memberExpression.value, NodeType.Identifier);
    });

    test.each([
        { expression: "youngest.age otherwise 0", leftType: NodeType.MemberExpression },
        { expression: "youngest.age + (10 / 3) otherwise 0", leftType: NodeType.BinaryExpression },
        { expression: "if youngest.age > 10 then youngest.age else 10 otherwise 0", leftType: NodeType.ConditionalExpression }
    ])("should parse otherwise expression (%#)", entry => {
        const { expression, leftType } = entry;

        const code = `
            agent person 10 {
                const age = random(0, 30);
                property youngest = min(agents(person) | p -> p.age);

                property value = ${expression};
            }
        `;
        const program = getProgram(code);

        const propertyDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "value");
        const otherwiseExpression = TestSupport.expectNode<OtherwiseExpression>(propertyDeclaration.value, NodeType.OtherwiseExpression);

        expect(otherwiseExpression.left.type).toBe(leftType);
    });

    test.each([
        { expression: "age" },
        { expression: "min_age" },
        { expression: "max_age" }
    ])("should parse identifier (%#)", entry => {
        const { expression } = entry;
        const code = `define min_age = 0; define max_age = 20; agent person 10 { const age = ${expression}; }`;

        const program = getProgram(code);

        const constDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "age");
        const identifier = TestSupport.expectNode<Identifier>(constDeclaration.value, NodeType.Identifier);

        expect(identifier.identifier).toBe(expression);
    });

    test.each([
        { expression: "0", parseFunc: parseInt },
        { expression: "2", parseFunc: parseInt },
        { expression: "23", parseFunc: parseInt },
        { expression: "100.42", parseFunc: parseFloat },
        { expression: "0.2528", parseFunc: parseFloat }
    ])("should parse numeric literal (%#)", entry => {
        const { expression, parseFunc } = entry;
        const code = `agent person 10 { const age = ${expression}; }`;

        const program = getProgram(code);

        const constDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "age");
        const numericLiteral = TestSupport.expectNode<NumericLiteral>(constDeclaration.value, NodeType.NumericLiteral);

        expect(numericLiteral.value).toBe(parseFunc(expression));
    });

    test.each([
        { expression: "true", value: true },
        { expression: "false", value: false },
    ])("should parse boolean literal (%#)", entry => {
        const { expression, value } = entry;
        const code = `agent person 10 { const employed = ${expression}; }`;

        const program = getProgram(code);

        const constDeclaration = TestSupport.expectPropertyDeclaration(program, "person", "employed");
        const booleanLiteral = TestSupport.expectNode<BooleanLiteral>(constDeclaration.value, NodeType.BooleanLiteral);

        expect(booleanLiteral.value).toBe(value);
    });

    test.each([
        { code: "", counts: [ 0, 0, 0 ] },
        { code: "define speed = 1;", counts: [ 1, 0, 0 ] },
        { code: "define speed = 1; define debug = false;", counts: [ 2, 0, 0 ] },
        { code: "agent person 10 {}", counts: [ 0, 1, 0 ] },
        { code: "agent person 10 { const a = 1; const b = 2; }", counts: [ 0, 1, 2 ] },
        { code: "define debug = false; agent person 10 { const a = 1; }", counts: [ 1, 1, 1 ] },
        { code: "define debug = false; agent person 10 { const a = 1; const b = 2; } agent building 20 { const c = 3; }", counts: [ 1, 2, 3 ] },

    ])("should parse correct agent, property and define declaration counts", entry => {
        const { code, counts } = entry;
        
        const defineCount = counts[0];
        const agentCount = counts[1];
        const propertyCount = counts[2];

        const program = getProgram(code);

        expect(program.body.length).toBe(defineCount + agentCount);

        let agentDeclarations = program.body
            .filter(declaration => declaration.type === NodeType.ObjectDeclaration)
            .map(declaration => declaration as ObjectDeclaration);

        let actualPropertyCount = 0;

        for (const agentDeclaration of agentDeclarations) {
            actualPropertyCount += agentDeclaration.body.length;
        }

        expect(actualPropertyCount).toBe(propertyCount);
    });

    test("should allow only define and agent declarations in program scope", () => {
        const code = "property p = 10 + 2; define debug = false; agent person 10 {}";
        expect(() => getProgram(code)).toThrow(ErrorParser);
    });

    test.each([
        { code: "agent person 10 { define debug = false; }" },
        { code: "agent person 10 { agent building 2 {} }" }
    ])
    ("should allow only property and const declarations in agent body", entry => {
        const { code } = entry;
        expect(() => getProgram(code)).toThrow(ErrorParser);
    });

    test("should not allow adding default value to const", () => {
        const code = "agent person 10 { const c: 10 = 20; }";
        expect(() => getProgram(code).toThrow(ErrorParser));
    });

    test.each([
        { code: "agent person 10 2 {}" },
        { code: "agent agent 10 2 {}" },
        { code: "define a a = 20;" },
        { code: "agent person 10 { property a = 20 +; };" },
        { code: "agent person 10 { const a = true true; }" },
        { code: "agent person 10 { const a = 1 + + 2; }" }
    ])
    ("should throw error when parsing unexpected token", entry => {
        const { code } = entry;
        expect(() => getProgram(code)).toThrow(ErrorParser);
    });
});