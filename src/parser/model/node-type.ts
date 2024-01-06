
export enum NodeType {
    // Statements
    Program = "Program",
    ObjectDeclaration = "ObjectDeclaration",
    VariableDeclaration = "VariableDeclaration",
    DefineDeclaration = "DefineDeclaration",
    // Expressions
    NumericLiteral = "NumericLiteral",
    BooleanLiteral = "BooleanLiteral",
    Identifier = "Identifier",
    BinaryExpression = "BinaryExpression",
    UnaryExpression = "UnaryExpression",
    LogicalExpression = "LogicalExpression",
    ConditionalExpression = "ConditionalExpression",
    CallExpression = "CallExpression",
    LambdaExpression = "LambdaExpression",
    MemberExpression = "MemberExpression",
    OtherwiseExpression = "OtherwiseExpression",
}