import { Position } from "../lexer/lexer.types";

export enum NodeType {
    // Statements
    Program = "Program",
    VariableDeclaration = "VariableDeclaration",
    ObjectDeclaration = "ObjectDeclaration",
    // Expressions
    NumericLiteral = "NumericLiteral",
    BooleanLiteral = "BooleanLiteral",
    Identifier = "Identifier",
    BinaryExpression = "BinaryExpression",
    LogicalExpression = "LogicalExpression"
}

export enum VariableType {
    Const = "Const",
    Variable = "Variable",
    Dynamic = "Dynamic"
}

export interface Statement {
    type: NodeType;
    position: Position;
}

export interface Expression extends Statement {}

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

export interface ObjectDeclaration extends Statement {
    type: NodeType.ObjectDeclaration;
    identifier: string;
    count: number;
    body: VariableDeclaration[];
}

export interface BinaryExpression extends Expression {
    type: NodeType.BinaryExpression;
    left: Expression;
    right: Expression;
    operator: string;
}

export interface LogicalExpression extends Expression {
    type: NodeType.LogicalExpression;
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

export interface BooleanLiteral extends Expression {
    type: NodeType.BooleanLiteral;
    value: boolean;
}