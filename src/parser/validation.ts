import { ErrorParser } from "../utils/index.ts";
import { DefineDeclaration, NodeType, ObjectDeclaration, Program, VariableDeclaration } from "./model/index.ts";

export class Validation {

    /**
     * Statically validates the agent, property and define declarations in a program
     * 
     * @param program - program to validate
     */
    public static validate(program: Program): void {
        Validation.validateDefineDeclarationIdentifiers(program);
        Validation.validateAgentDeclarationIdentifiers(program);
        Validation.validatePropertyDeclarationIdentifiers(program);
    }

    /**
     * Checks for duplicate define declarations in a program
     * Throws an exception if duplicate define declarations were found
     * 
     * @param program - program to check duplicate define declarations in
     */
    private static validateDefineDeclarationIdentifiers(program: Program): void {
        const defineDeclarations = program.body
            .filter(statement => statement.type === NodeType.DefineDeclaration)
            .map(statement => statement as DefineDeclaration);

        const identifiers = new Set<string>();

        for (const defineDeclaration of defineDeclarations) {
            const { identifier, position } = defineDeclaration;

            if (identifiers.has(identifier)) {
                throw new ErrorParser(`Duplicate define declaration identifiers detected ('${identifier}')`, position);
            }

            identifiers.add(identifier);
        }
    }

    /**
     * Checks for duplicate agent declarations in a program
     * Throws an exception if duplicate agent declarations were found
     * 
     * @param program - program to check duplicate agent declarations in
     */
    private static validateAgentDeclarationIdentifiers(program: Program): void {
        const agentDeclarations = program.body
            .filter(statement => statement.type === NodeType.ObjectDeclaration)
            .map(statement => statement as ObjectDeclaration);

        const identifiers = new Set<string>();

        for (const agentDeclaration of agentDeclarations) {
            const { identifier, position } = agentDeclaration;

            if (identifiers.has(identifier)) {
                throw new ErrorParser(`Duplicate agent declaration identifiers detected ('${identifier}')`, position);
            }

            identifiers.add(identifier);
        }
    }

    /**
     * Checks for duplicate property declarations in a program
     * Throws an exception if duplicate property declarations were found
     * 
     * @param program - program to check duplicate property declarations in
     */
    private static validatePropertyDeclarationIdentifiers(program: Program): void {
        const agentDeclarations = program.body
            .filter(statement => statement.type === NodeType.ObjectDeclaration)
            .map(statement => statement as ObjectDeclaration);

        for (const agentDeclaration of agentDeclarations) {
            const propertyDeclarations = agentDeclaration.body
                .filter(statement => statement.type === NodeType.VariableDeclaration)
                .map(statement => statement as VariableDeclaration);

            const identifiers = new Set<string>();

            for (const propertyDeclaration of propertyDeclarations) {
                const { identifier, position } = propertyDeclaration;

                if (identifiers.has(identifier)) {
                    throw new ErrorParser(`Duplicate property declaration identifiers detected ('${identifier}')`, position);
                }

                identifiers.add(identifier);
            }
        }
    }
}