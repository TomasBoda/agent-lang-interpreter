import { ErrorParser } from "../utils";
import { DefineDeclaration, NodeType, ObjectDeclaration, Program, VariableDeclaration } from "./model";

export class Validation {

    public static validate(program: Program): void {
        Validation.validateDefineDeclarationIdentifiers(program);
        Validation.validateObjectDeclarationIdentifiers(program);
        Validation.validatePropertyDeclarationIdentifiers(program);
    }

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

    private static validatePropertyDeclarationIdentifiers(program: Program): void {
        const objectDeclarations = program.body
            .filter(statement => statement.type === NodeType.ObjectDeclaration)
            .map(statement => statement as ObjectDeclaration);

        for (const objectDeclaration of objectDeclarations) {
            const propertyDeclarations = objectDeclaration.body
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