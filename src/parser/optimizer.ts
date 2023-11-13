import { BinaryExpression, CallExpression, ConditionalExpression, Expression, Identifier, LambdaExpression, LogicalExpression, MemberExpression, NodeType, ObjectDeclaration, ParserError, ParserValue, Program, UnaryExpression, VariableDeclaration } from "./parser.types";
import { Error } from "../utils/error";
import { DependencyGraph, Node, topologicalSort } from "./topology";

export function getProgram(program: Program): Program | ParserError {
    for (let i = 0; i < program.body.length; i++) {
        const declaration: ObjectDeclaration | ParserError = getObjectDeclaration(program.body[i] as ObjectDeclaration);

        if (declaration.type === NodeType.Error) {
            return declaration as ParserError;
        }

        program.body[i] = declaration;
    }

    return program;
}

function getObjectDeclaration(declaration: ObjectDeclaration): ObjectDeclaration | ParserError {
    const objectIdentifiers: string[] = [];
    const objectDependencies: string[][] = [];

    for (let i = 0; i < declaration.body.length; i++) {
        const variableDeclaration: VariableDeclaration = declaration.body[i] as VariableDeclaration;

        const identifier: string = variableDeclaration.identifier;
        const dependencies: string[] = getVariableDependencies(variableDeclaration);

        if (dependencies.includes(identifier) && variableDeclaration.default === undefined) {
            return Error.parser("Agent variable depends on itself, but has no default value provided");
        }

        objectIdentifiers.push(identifier);
        objectDependencies.push(dependencies);
    }

    const nodes: Node[] | ParserError = getSortedDependencies(objectIdentifiers, objectDependencies);

    if (!Array.isArray(nodes)) {
        return nodes as ParserError;
    }

    const sortedBody: Expression[] = [];

    for (const node of nodes) {
        for (const expression of declaration.body) {
            if ((expression as VariableDeclaration).identifier === node.identifier) {
                sortedBody.push(expression);
                break;
            }
        }
    }

    return { ...declaration, body: sortedBody } as ObjectDeclaration;
}

function getSortedDependencies(identifiers: string[], dependencies: string[][]): Node[] | ParserError {
    const graph: DependencyGraph = {};

    for (const identifier of identifiers) {
        graph[identifier] = new Node(identifier);
    }

    dependencies.forEach((items: string[], index: number) => {
        const identifier = identifiers[index];

        items.forEach((dependency: string) => {
            graph[identifier].addDependency(graph[dependency]);
        });
    });

    return topologicalSort(graph);
}

function getVariableDependencies(variableDeclaration: VariableDeclaration): string[] {
    const dependencies: string[] = [];

    function getDependencies(expression: Expression): void {
        switch (expression.type) {
            case NodeType.BinaryExpression: {
                getDependencies((expression as BinaryExpression).left);
                getDependencies((expression as BinaryExpression).right);
                break;
            }
            case NodeType.UnaryExpression: {
                getDependencies((expression as UnaryExpression).value);
                break;
            }
            case NodeType.LogicalExpression: {
                getDependencies((expression as LogicalExpression).left);
                getDependencies((expression as LogicalExpression).right);
                break;
            }
            case NodeType.ConditionalExpression: {
                getDependencies((expression as ConditionalExpression).condition);
                getDependencies((expression as ConditionalExpression).consequent);
                getDependencies((expression as ConditionalExpression).alternate);
                break;
            }
            case NodeType.CallExpression: {
                for (const arg of (expression as CallExpression).args) {
                    getDependencies(arg);
                }
                break;
            }
            case NodeType.LambdaExpression: {
                getDependencies((expression as LambdaExpression).base);
                getDependencies((expression as LambdaExpression).value);
                break;
            }
            case NodeType.MemberExpression: {
                getDependencies((expression as MemberExpression).caller);
                getDependencies((expression as MemberExpression).value);
                break;
            }
            case NodeType.Identifier: {
                dependencies.push((expression as Identifier).identifier);
                break;
            }
        }
    }

    getDependencies(variableDeclaration.value);

    return dependencies;
}