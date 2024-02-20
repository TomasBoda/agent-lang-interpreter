import { ErrorParser } from "../../utils";
import { BinaryExpression, CallExpression, ConditionalExpression, DefineDeclaration, Expression, Identifier, LambdaExpression, LogicalExpression, MemberExpression, NodeType, ObjectDeclaration, Program, UnaryExpression, VariableDeclaration } from "../model";

export class Node {

    public identifier: string;
    public dependencies: Node[] = [];

    constructor(identifier: string) {
        this.identifier = identifier;
    }

    public addDependency(node: Node): void {
        this.dependencies.push(node);
    }
}

export type DependencyGraph = { [key: string]: Node };

export class Topology {

    private agentIdentifiers: string[] = [];

    public getSortedProgram(program: Program): Program {
        this.agentIdentifiers = this.getObjectDeclarationIdentifiers(program);
        return this.getSortedAgentAndDefineDeclarations(program);
    }

    // sorts define and agent declarations in program scope
    private getSortedAgentAndDefineDeclarations(program: Program): Program {
        const objectDeclarations = program.body
            .filter(statement => statement.type === NodeType.ObjectDeclaration)
            .map(statement => statement as ObjectDeclaration)
            .map(declaration => this.getSortedPropertyDeclarations(declaration));

        const defineDeclarations = program.body
            .filter(statement => statement.type === NodeType.DefineDeclaration)
            .map(statement => statement as DefineDeclaration);

        const declarations = [ ...defineDeclarations, ...objectDeclarations ];

        return { ...program, body: declarations };
    }
    
    private getSortedPropertyDeclarations(declaration: ObjectDeclaration): ObjectDeclaration {
        const variableIdentifiers: string[] = [];
        const variableDependencies: string[][] = [];
    
        const variableDeclarations: VariableDeclaration[] = declaration.body
            .filter(declaration => declaration.type === NodeType.VariableDeclaration)
            .map(declaration => declaration as VariableDeclaration)
    
        for (const variableDeclaration of variableDeclarations) {
            const { identifier } = variableDeclaration;
            const dependencies: string[] = this.getVariableDependencies(variableDeclaration);
    
            if (dependencies.includes(identifier) && variableDeclaration.default === undefined) {
                throw new ErrorParser("Agent variable depends on itself, but has no default value provided");
            }
    
            variableIdentifiers.push(identifier);
            variableDependencies.push(dependencies);
        }
    
        const nodes: Node[] = this.getSortedDependencies(variableIdentifiers, variableDependencies);
        const body: Expression[] = this.getSortedObjectDeclarationBody(variableDeclarations, nodes);
    
        return { ...declaration, body } as ObjectDeclaration;
    }

    private getSortedObjectDeclarationBody(declarations: VariableDeclaration[], nodes: Node[]): Expression[] {
        const expressions: Expression[] = [];

        for (const node of nodes) {
            for (const declaration of declarations) {
                if (declaration.identifier === node.identifier) {
                    expressions.push(declaration);
                    break;
                }
            }
        }

        return expressions;
    }

    private getObjectDeclarationIdentifiers(program: Program): string[] {
        return program.body
            .filter(statement => statement.type === NodeType.ObjectDeclaration)
            .map(statement => statement as ObjectDeclaration)
            .map(declaration => declaration.identifier);
    }
    
    private getSortedDependencies(identifiers: string[], dependencies: string[][]): Node[] {
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
    
        return this.topologicalSort(graph);
    }
    
    private topologicalSort(graph: DependencyGraph): Node[] {
        const visited: { [key: string]: boolean } = {};
        const recursionStack: { [key: string]: boolean } = {};
        const result: Node[] = [];
    
        let containsCycle = false;
    
        function isSelfLoop(node: Node): boolean {
            return node.dependencies.some(dep => dep === node);
        }
    
        function visit(node: Node) {
            if (recursionStack[node.identifier]) {
                containsCycle = true;
                return;
            }
    
            if (visited[node.identifier]) {
                return;
            }
    
            visited[node.identifier] = true;
            recursionStack[node.identifier] = true;
    
            for (const dependency of node.dependencies) {
                if (!isSelfLoop(dependency)) {
                    visit(dependency);
                }
            }
    
            recursionStack[node.identifier] = false;
            result.push(node);
        }
    
        for (const key in graph) {
            visit(graph[key]);
        }
    
        if (containsCycle) {
            throw new ErrorParser("Agent variables contain a dependency loop");
        }
    
        return result;
    }

    private getVariableDependencies(variableDeclaration: VariableDeclaration): string[] {
        const agentIdentifiers = this.agentIdentifiers;
        const dependencies: string[] = [];
    
        if (variableDeclaration.default) {
            getDependencies(variableDeclaration.default);
            
            if (dependencies.length === 0) {
                return [];
            }
        }
    
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
}