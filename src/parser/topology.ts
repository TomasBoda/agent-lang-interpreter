import { ErrorParser } from "../utils";
import { BinaryExpression, CallExpression, ConditionalExpression, DefineDeclaration, DependencyGraph, Expression, Identifier, LogicalExpression, MemberExpression, Node, NodeType, ObjectDeclaration, Program, SetComprehensionExpression, UnaryExpression, VariableDeclaration } from "./model";

export class Topology {

    private agentIdentifiers: string[] = [];

    /**
     * Sorts the objects' variable declarations topologically in order to minimize runtime errors
     * 
     * @param program - parsed program in AST form
     * @returns topologically sorted AST
     */
    public getSortedProgram(program: Program): Program {
        this.agentIdentifiers = this.getObjectDeclarationIdentifiers(program);
        return this.getSortedAgentAndDefineDeclarations(program);
    }

    /**
     * Sorts the top-level declarations (objects, global variables) in order to optimize program runtime
     * 
     * @param program - parsed program in AST form
     * @returns sorted AST
     */
    private getSortedAgentAndDefineDeclarations(program: Program): Program {
        const defineDeclarations = this.getDefineDeclarations(program);
        const objectDeclarations = this.getObjectDeclarations(program);

        objectDeclarations.map(declaration => this.getSortedObjectDeclaration(declaration));

        const declarations = [ ...defineDeclarations, ...objectDeclarations ];

        return { ...program, body: declarations };
    }
    
    /**
     * Sorts variable declarations of an object topologically
     * 
     * @param objectDeclaration - object declaration whose properties to sort topologically
     * @returns sorted object declaration
     */
    private getSortedObjectDeclaration(objectDeclaration: ObjectDeclaration): ObjectDeclaration {
        const variableIdentifiers: string[] = [];
        const variableDependencies: string[][] = [];

        const variableDeclarations = this.getVariableDeclarations(objectDeclaration);

        variableDeclarations.forEach(variableDeclaration => {
            const { identifier, position } = variableDeclaration;
            const dependencies = this.getVariableDependencies(variableDeclaration);
    
            if (dependencies.includes(identifier) && variableDeclaration.default === undefined) {
                throw new ErrorParser(`Agent property '${identifier}' depends on itself, but has no default value provided`, position);
            }
    
            variableIdentifiers.push(identifier);
            variableDependencies.push(dependencies);
        });
    
        const dependencyGraph: DependencyGraph = this.getVariableDependencyGraph(variableIdentifiers, variableDependencies);
        const sortedDependencies: Node[] = this.topologicalSort(dependencyGraph);

        objectDeclaration.body = this.getSortedVariableDeclarations(variableDeclarations, sortedDependencies);
    
        return objectDeclaration;
    }

    /**
     * Sorts variable declarations based on nodes of an already topologically sorted dependency graph
     * 
     * @param declarations - an array of variable declarations to sort
     * @param nodes - topologically sorted nodes of a dependency graph
     * @returns topologically sorted array of variable declarations
     */
    private getSortedVariableDeclarations(declarations: VariableDeclaration[], nodes: Node[]): Expression[] {
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

    /**
     * Finds all variable dependencies of the current variable declaration
     * 
     * @param variableDeclaration - variable declaration whose variable dependencies to find
     * @returns an array of variable dependencies identifiers
     */
    private getVariableDependencies(variableDeclaration: VariableDeclaration): string[] {
        const agentIdentifiers = this.agentIdentifiers;
        const dependencies: string[] = [];
    
        if (variableDeclaration.default) {
            getDependencies(variableDeclaration.default);
            
            if (dependencies.length === 0) {
                return [];
            }
        }
    
        let setComprehensionKey: string | undefined = undefined;
    
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
                case NodeType.SetComprehensionExpression: {
                    setComprehensionKey = (expression as SetComprehensionExpression).param;
                    getDependencies((expression as SetComprehensionExpression).base);
                    getDependencies((expression as SetComprehensionExpression).value);
                    setComprehensionKey = undefined;
                    break;
                }
                case NodeType.MemberExpression: {
                    if (setComprehensionKey && (expression as MemberExpression).caller.type === NodeType.Identifier && ((expression as MemberExpression).caller as Identifier).identifier === setComprehensionKey) {
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
    
    /**
     * Produces a dependency graph of all variable dependencies of an object
     * 
     * @param identifiers - identifiers of the object's variable declarations
     * @param dependencies - variable dependencies of the object's variable declarations
     * @returns dependency graph representing variable dependencies of an object
     */
    private getVariableDependencyGraph(identifiers: string[], dependencies: string[][]): DependencyGraph {
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
    
        return graph;
    }
    
    /**
     * Sorts a dependency graph topologically
     * 
     * @param graph - dependency graph to sort topologically
     * @returns array of topologically sorted nodes of the dependency graph
     */
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
                if (dependency && !isSelfLoop(dependency)) {
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

    /**
     * Finds all global variable declarations in a program
     * 
     * @param program - program to find global variable declarations in
     * @returns array of program's global variable declarations
     */
    private getDefineDeclarations(program: Program): DefineDeclaration[] {
        return program.body
            .filter(statement => statement.type === NodeType.DefineDeclaration)
            .map(statement => statement as DefineDeclaration);
    }

    /**
     * Finds all object declarations in a program
     * 
     * @param program - program to find object declarations in
     * @returns array of program's object declarations
     */
    private getObjectDeclarations(program: Program): ObjectDeclaration[] {
        return program.body
            .filter(statement => statement.type === NodeType.ObjectDeclaration)
            .map(statement => statement as ObjectDeclaration);
    }

    /**
     * Finds all variable declarations in an object declaration
     * 
     * @param objectDeclaration - object declaration to find variable declarations in
     * @returns array of object declaration's variable declarations
     */
    private getVariableDeclarations(objectDeclaration: ObjectDeclaration): VariableDeclaration[] {
        return objectDeclaration.body
            .filter(declaration => declaration.type === NodeType.VariableDeclaration)
            .map(declaration => declaration as VariableDeclaration)
    }

    /**
     * Finds all identifiers of all object declarations in a program
     * 
     * @param program - program to find all object declarations' identifiers in
     * @returns array of all object declarations' identifiers
     */
    private getObjectDeclarationIdentifiers(program: Program): string[] {
        return this.getObjectDeclarations(program)
            .map(declaration => declaration.identifier);
    }
}