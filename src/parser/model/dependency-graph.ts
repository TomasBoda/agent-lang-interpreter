
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