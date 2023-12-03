import { BinaryExpression, CallExpression, ConditionalExpression, Expression, Identifier, LambdaExpression, LogicalExpression, MemberExpression, NodeType, ObjectDeclaration, ParserValue, Program, UnaryExpression, VariableDeclaration } from "../parser.types";
import { DependencyGraph, Node, topologicalSort } from "./topology";
import { ErrorParser } from "../../utils/errors";

const agentIdentifiers: string[] = [];

export function getProgram(program: Program): Program {
    for (let i = 0; i < program.body.length; i++) {
        const declaration: ObjectDeclaration = program.body[i] as ObjectDeclaration;
        agentIdentifiers.push(declaration.identifier);
    }

    for (let i = 0; i < program.body.length; i++) {
        program.body[i] = getObjectDeclaration(program.body[i] as ObjectDeclaration);
    }

    return program;
}

function getObjectDeclaration(declaration: ObjectDeclaration): ObjectDeclaration {
    const objectIdentifiers: string[] = [];
    const objectDependencies: string[][] = [];

    for (let i = 0; i < declaration.body.length; i++) {
        const variableDeclaration: VariableDeclaration = declaration.body[i] as VariableDeclaration;

        const identifier: string = variableDeclaration.identifier;
        const dependencies: string[] = getVariableDependencies(variableDeclaration);

        if (dependencies.includes(identifier) && variableDeclaration.default === undefined) {
            throw new ErrorParser("Agent variable depends on itself, but has no default value provided");
        }

        objectIdentifiers.push(identifier);
        objectDependencies.push(dependencies);
    }

    const nodes: Node[] = getSortedDependencies(objectIdentifiers, objectDependencies);

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

function getSortedDependencies(identifiers: string[], dependencies: string[][]): Node[] {
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
    let lambdaKey: string | undefined = undefined;

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
                lambdaKey = (expression as LambdaExpression).param;
                getDependencies((expression as LambdaExpression).base);
                getDependencies((expression as LambdaExpression).value);
                lambdaKey = undefined;
                break;
            }
            case NodeType.MemberExpression: {
                if (lambdaKey && (expression as MemberExpression).caller.type === NodeType.Identifier && ((expression as MemberExpression).caller as Identifier).identifier === lambdaKey) {
                    break;
                } else {
                    getDependencies((expression as MemberExpression).caller);
                }
                break;
            }
            case NodeType.Identifier: {
                const identifier = (expression as Identifier).identifier;

                if (!dependencies.includes(identifier) && !agentIdentifiers.includes(identifier)) {
                    dependencies.push((expression as Identifier).identifier);
                }
                break;
            }
        }
    }

    getDependencies(variableDeclaration.value);

    return dependencies;
}