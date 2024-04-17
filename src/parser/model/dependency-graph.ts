
/**
 * Node of the dependency graph
 */
export class Node {

    public identifier: string;
    public dependencies: Node[] = [];

    constructor(identifier: string) {
        this.identifier = identifier;
    }

    /**
     * Adds a new dependency (directed edge) from the current node to the given node
     * 
     * @param node node to add the directed edge to
     */
    public addDependency(node: Node): void {
        this.dependencies.push(node);
    }
}

export type DependencyGraph = { [key: string]: Node };