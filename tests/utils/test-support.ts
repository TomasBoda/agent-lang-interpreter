import { expect } from "bun:test";
import { DefineDeclaration, NodeType, ObjectDeclaration, ParserValue, Program, RuntimeValue, ValueType, VariableDeclaration } from "../../src";

export class TestSupport {

    // runtime

    public static expectValue<T extends RuntimeValue>(value: RuntimeValue | undefined, type: ValueType): T {
        expect(value).toBeDefined();
        expect(value!.type).toBe(type);
        return value! as T;
    }

    // parser

    public static expectNode<T extends ParserValue>(node: ParserValue, type: NodeType): T {
        expect(node.type).toBe(type);
        return node as T;
    }

    public static expectAgentDeclaration(program: Program, identifier: string): ObjectDeclaration {
        expect(program.body.length).not.toBe(0);

        const agentDeclarations = program.body
            .filter(declaration => declaration.type === NodeType.ObjectDeclaration)
            .map(declaration => declaration as ObjectDeclaration);

        expect(agentDeclarations.length).not.toBe(0);

        const agentDeclaration = agentDeclarations.find(declaration => declaration.identifier === identifier);

        expect(agentDeclaration).toBeDefined();

        return agentDeclaration!;
    }

    public static expectPropertyDeclaration(program: Program, agentIdentifier: string, identifier: string): VariableDeclaration {
        const agentDeclaration = TestSupport.expectAgentDeclaration(program, agentIdentifier);

        const propertyDeclarations = agentDeclaration.body
            .filter(declaration => declaration.type === NodeType.VariableDeclaration)
            .map(declaration => declaration as VariableDeclaration);

        const propertyDeclaration = propertyDeclarations.find(declaration => declaration.identifier === identifier);

        expect(propertyDeclaration).toBeDefined();

        return propertyDeclaration!;
    }

    public static expectDefineDeclaration(program: Program, identifier: string): DefineDeclaration {
        expect(program.body.length).not.toBe(0);

        const defineDeclarations = program.body
            .filter(declaration => declaration.type === NodeType.DefineDeclaration)
            .map(declaration => declaration as DefineDeclaration);

        expect(defineDeclarations.length).not.toBe(0);

        const defineDeclaration = defineDeclarations.find(declaration => declaration.identifier === identifier);

        expect(defineDeclaration).toBeDefined();

        return defineDeclaration!;
    }
}