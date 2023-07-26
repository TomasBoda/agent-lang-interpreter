
export enum NodeType {
    Program = "Program",
    NumericLiteral = "NumericLiteral",
    Identifier = "Identifier",
    BinaryExpression = "BinaryExpression"
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