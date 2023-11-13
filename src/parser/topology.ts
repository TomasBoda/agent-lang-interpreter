import { ParserError } from "./parser.types";
import { Error } from "../utils/error";

export type DependencyGraph = { [key: string]: Node };

export class Node {
    public identifier: string;
    public dependencies: Node[];

    constructor(identifier: string) {
        this.identifier = identifier;
        this.dependencies = [];
    }

    public addDependency(node: Node): void {
        this.dependencies.push(node);
    }
}

export function topologicalSort(graph: DependencyGraph): Node[] | ParserError {
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
        return Error.parser("Agent variables contain a dependency loop");
    }

    return result;
}