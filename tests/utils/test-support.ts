import { expect } from "bun:test";
import { DefineDeclaration, NodeType, ObjectDeclaration, ParserValue, Program, RuntimeValue, ValueType, VariableDeclaration } from "../../src/index.ts";

export class TestSupport {

    /**
     * Expects the given generic runtime value to be of the given type
     * 
     * @param value generic runtime value to assert
     * @param type expected type of the runtime value
     * @returns runtime value of the given type
     */
    public static expectValue<T extends RuntimeValue>(value: RuntimeValue | undefined, type: ValueType): T {
        expect(value).toBeDefined();
        expect(value!.type).toBe(type);
        return value! as T;
    }

    /**
     * Expects the given generic AST node to be of the given type
     * 
     * @param node generic AST node to assert
     * @param type expected type of the AST node
     * @returns AST node of the given type
     */
    public static expectNode<T extends ParserValue>(node: ParserValue, type: NodeType): T {
        expect(node.type).toBe(type);
        return node as T;
    }

    /**
     * Expects an object declaration with the given identifier to be present in the given program AST node
     * 
     * @param program program AST node to search the object declaration in
     * @param identifier identifier of the object declaration to find
     * @returns object declaration AST node
     */
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

    /**
     * Expects an variable declaration with the given identifier to be present in the given program AST node in an object declaration with the given identifier
     * 
     * @param program program AST node to search the variable declaration in
     * @param agentIdentifier identifier of the object declaration AST node to search in
     * @param identifier identifier of the variable declaration to find
     * @returns variable declaration AST node
     */
    public static expectPropertyDeclaration(program: Program, agentIdentifier: string, identifier: string): VariableDeclaration {
        const agentDeclaration = TestSupport.expectAgentDeclaration(program, agentIdentifier);

        const propertyDeclarations = agentDeclaration.body
            .filter(declaration => declaration.type === NodeType.VariableDeclaration)
            .map(declaration => declaration as VariableDeclaration);

        const propertyDeclaration = propertyDeclarations.find(declaration => declaration.identifier === identifier);

        expect(propertyDeclaration).toBeDefined();

        return propertyDeclaration!;
    }

    /**
     * Expects a define declaration with the given identifier to be present in the given program AST node
     * 
     * @param program program AST node to search the define declaration in
     * @param identifier identifier of the define declaration to find
     * @returns define declaration AST node
     */
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