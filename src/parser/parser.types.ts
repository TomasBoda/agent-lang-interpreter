
export enum NodeType {
    // Errors
    Error = "Error",
    // Statements
    Program = "Program",
    ObjectDeclaration = "ObjectDeclaration",
    VariableDeclaration = "VariableDeclaration",
    // Expressions
    NumericLiteral = "NumericLiteral",
    BooleanLiteral = "BooleanLiteral",
    Identifier = "Identifier",
    BinaryExpression = "BinaryExpression",
    LogicalExpression = "LogicalExpression",
    ConditionalExpression = "ConditionalExpression",
    CallExpression = "CallExpression",
    LambdaExpression = "LambdaExpression",
}

export enum VariableType {
    Const = "Const",
    Variable = "Variable",
    Dynamic = "Dynamic"
}

export interface ParserValue {
    type: NodeType;
}

export interface ParserError extends ParserValue {
    type: NodeType.Error;
    message: string;
}

export interface Statement extends ParserValue {}

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

export interface LambdaExpression extends Expression {
    type: NodeType.LambdaExpression;
    base: Expression;
    param: string;
    value: Expression;
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