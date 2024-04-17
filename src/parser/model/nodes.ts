import { Position } from "../../symbolizer/index.ts";
import { NodeType } from "./node-type.ts";
import { VariableType } from "./variable-type.ts";

/**
 * Generic AST node
 */
export interface ParserValue {
    /** type of the AST node */
    type: NodeType;
    /** position of the AST node in source code */
    position: Position;
}

/**
 * AST node representing a generic statement
 */
export interface Statement extends ParserValue {}

/**
 * AST node representing a generic expression
 */
export interface Expression extends Statement {}

/**
 * AST node representing a program
 */
export interface Program extends Statement {
    type: NodeType.Program;
    /** list of statements in the body of the program */
    body: Statement[];
}

/**
 * AST node representing an object declaration
 */
export interface ObjectDeclaration extends Statement {
    type: NodeType.ObjectDeclaration;
    /** identifier of the object declaration */
    identifier: string;
    /** count of the object declaration instances to generate */
    count: Expression;
    /** list of variable declarations in the body of the object declaration */
    body: Expression[];
}

/**
 * AST node representing a variable declaration
 */
export interface VariableDeclaration extends Statement {
    type: NodeType.VariableDeclaration;
    /** type of the variable */
    variableType: VariableType;
    /** identifier of the variable declaration */
    identifier: string;
    /** value of the variable declaration */
    value: Expression;
    /** default initial value of the variable declaration (if it is of type property) */
    default?: Expression;
}

/**
 * AST node representing a define declaration
 */
export interface DefineDeclaration extends Statement {
    type: NodeType.DefineDeclaration;
    /** identifier of the define declaration */
    identifier: string;
    /** value of the define declaration */
    value: Expression;
}

/**
 * AST node representing a binary expression
 */
export interface BinaryExpression extends Expression {
    type: NodeType.BinaryExpression;
    /** operator of the binary expression */
    operator: string;
    /** left-hand side of the binary expression */
    left: Expression;
    /** right-hand side of the binary expression */
    right: Expression;
}

/**
 * AST node representing a unary expression
 */
export interface UnaryExpression extends Expression {
    type: NodeType.UnaryExpression;
    /** operator of the unary expression */
    operator: string;
    /** value of the unary expression */
    value: Expression;
}

/**
 * AST node representing a logical expression
 */
export interface LogicalExpression extends Expression {
    type: NodeType.LogicalExpression;
    /** operator of the logical expresion */
    operator: string;
    /** left-hand side of the logical expression */
    left: Expression;
    /** right-hand side of the logical expression */
    right: Expression;
}

/**
 * AST node representing a conditional expression
 */
export interface ConditionalExpression extends Expression {
    type: NodeType.ConditionalExpression;
    /** condition based on which to evaluate the conditional expression */
    condition: Expression;
    /** expression to evaluate if the condition was evaluated to true */
    consequent: Expression;
    /** expression to evaluate if the condition was evaluated to false */
    alternate: Expression;
}

/**
 * AST node representing a call expression
 */
export interface CallExpression extends Expression {
    type: NodeType.CallExpression;
    /** caller of the expression */
    caller: Expression;
    /** argument list of the call expression */
    args: Expression[];
}

/**
 * AST node representing a set comprehension expression
 */
export interface SetComprehensionExpression extends Expression {
    type: NodeType.SetComprehensionExpression;
    /** base of the set comprehension expression */
    base: Expression;
    /** param identifier */
    param: string;
    /** value based on which to evaluate the set comprehension expression */
    value: Expression;
}

/**
 * AST node representing a member expression
 */
export interface MemberExpression extends Expression {
    type: NodeType.MemberExpression;
    /** caller of the member expression */
    caller: Expression;
    /** value of the member expression */
    value: Expression;
}

/**
 * AST node representing an otherwise expression
 */
export interface OtherwiseExpression extends Expression {
    type: NodeType.OtherwiseExpression;
    /** left-hand side of the otherwise expression */
    left: Expression;
    /** right-hand side of the otherwise expression */
    right: Expression;
}

/**
 * AST node representing an identifier
 */
export interface Identifier extends Expression {
    type: NodeType.Identifier;
    /** value of the identifier */
    identifier: string;
}

/**
 * AST node representing a numeric literal
 */
export interface NumericLiteral extends Expression {
    type: NodeType.NumericLiteral;
    /** value of the numeric literal */
    value: number;
}

/**
 * AST node representing a boolean literal
 */
export interface BooleanLiteral extends Expression {
    type: NodeType.BooleanLiteral;
    /** value of the boolean literal */
    value: boolean;
}