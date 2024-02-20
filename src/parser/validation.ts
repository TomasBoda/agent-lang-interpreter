import { writeFileSync } from "fs";
import { ErrorParser } from "../utils";
import { DefineDeclaration, NodeType, ObjectDeclaration, Program, VariableDeclaration } from "./model";

export class Validation {

    /**
     * Statically validates the global variable, object and variable declarations in a program
     * 
     * @param program - program to validate
     */
    public static validate(program: Program): void {
        Validation.validateDefineDeclarationIdentifiers(program);
        Validation.validateObjectDeclarationIdentifiers(program);
        Validation.validateVariableDeclarationIdentifiers(program);
    }

    /**
     * Checks for duplicate global variable declarations in a program
     * Throws an exception if duplicate global variable declarations were found
     * 
     * @param program - program to check duplicate global variable declarations in
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
     * Checks for duplicate object declarations in a program
     * Throws an exception if duplicate object declarations were found
     * 
     * @param program - program to check duplicate object declarations in
     */
    private static validateObjectDeclarationIdentifiers(program: Program): void {
        const objectDeclarations = program.body
            .filter(statement => statement.type === NodeType.ObjectDeclaration)
            .map(statement => statement as ObjectDeclaration);

        const identifiers = new Set<string>();

        for (const objectDeclaration of objectDeclarations) {
            const { identifier, position } = objectDeclaration;

            if (identifiers.has(identifier)) {
                throw new ErrorParser(`Duplicate agent declaration identifiers detected ('${identifier}')`, position);
            }

            identifiers.add(identifier);
        }
    }

    /**
     * Checks for duplicate variable declarations in a program
     * Throws an exception if duplicate variable declarations were found
     * 
     * @param program - program to check duplicate variable declarations in
     */
    private static validateVariableDeclarationIdentifiers(program: Program): void {
        const objectDeclarations = program.body
            .filter(statement => statement.type === NodeType.ObjectDeclaration)
            .map(statement => statement as ObjectDeclaration);

        for (const objectDeclaration of objectDeclarations) {
            const variableDeclarations = objectDeclaration.body
                .filter(statement => statement.type === NodeType.VariableDeclaration)
                .map(statement => statement as VariableDeclaration);

            const identifiers = new Set<string>();

            for (const variableDeclaration of variableDeclarations) {
                const { identifier, position } = variableDeclaration;

                if (identifiers.has(identifier)) {
                    throw new ErrorParser(`Duplicate property declaration identifiers detected ('${identifier}')`, position);
                }

                identifiers.add(identifier);
            }
        }
    }
}