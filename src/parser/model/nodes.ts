import { Position } from "../../symbolizer";
import { NodeType } from "./node-type";
import { VariableType } from "./variable-type";

export interface ParserValue {
    type: NodeType;
    position: Position;
}

export interface Statement extends ParserValue {
    position: Position;
}

export interface Expression extends Statement {
    
}

export interface Program extends Statement {
    type: NodeType.Program;
    body: Statement[];
}

export interface ObjectDeclaration extends Statement {
    type: NodeType.ObjectDeclaration;
    identifier: string;
    count: Expression;
    body: Expression[];
}

export interface VariableDeclaration extends Statement {
    type: NodeType.VariableDeclaration;
    variableType: VariableType;
    identifier: string;
    value: Expression;
    default?: Expression;
}

export interface DefineDeclaration extends Statement {
    type: NodeType.DefineDeclaration;
    identifier: string;
    value: Expression;
}

export interface BinaryExpression extends Expression {
    type: NodeType.BinaryExpression;
    left: Expression;
    right: Expression;
    operator: string;
}

export interface UnaryExpression extends Expression {
    type: NodeType.UnaryExpression;
    operator: string;
    value: Expression;
}

export interface LogicalExpression extends Expression {
    type: NodeType.LogicalExpression;
    left: Expression;
    right: Expression;
    operator: string;
}

export interface ConditionalExpression extends Expression {
    type: NodeType.ConditionalExpression;
    condition: Expression;
    consequent: Expression;
    alternate: Expression;
}

export interface CallExpression extends Expression {
    type: NodeType.CallExpression;
    caller: Expression;
    args: Expression[];
}

export interface SetComprehensionExpression extends Expression {
    type: NodeType.SetComprehensionExpression;
    base: Expression;
    param: string;
    value: Expression;
}

export interface MemberExpression extends Expression {
    type: NodeType.MemberExpression;
    caller: Expression;
    value: Expression;
}

export interface OtherwiseExpression extends Expression {
    type: NodeType.OtherwiseExpression;
    left: Expression;
    right: Expression;
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