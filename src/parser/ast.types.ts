
export enum NodeType {
    // Statements
    Program = "Program",
    VariableDeclaration = "VariableDeclaration",
    // Expressions
    NumericLiteral = "NumericLiteral",
    Identifier = "Identifier",
    BinaryExpression = "BinaryExpression"
}

export enum VariableType {
    Const = "Const",
    Variable = "Variable",
    Dynamic = "Dynamic"
}

export interface Statement {
    type: NodeType;
}

export interface Expression extends Statement {

}

export interface Program extends Statement {
    type: NodeType.Program;
    body: Statement[];
}

export interface VariableDeclaration extends Statement {
    type: NodeType.VariableDeclaration;
    variableType: VariableType;
    identifier: string;
    default?: Expression;
    value: Expression;
}

export interface BinaryExpression extends Expression {
    type: NodeType.BinaryExpression;
    left: Expression;
    right: Expression;
    operator: string;
}

export interface Identifier extends Expression {
    type: NodeType.Identifier;
    identifier: string;
}

export interface NumericLiteral extends Expression {
    type: NodeType.NumericLiteral;
    value: number;
}