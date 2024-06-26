import { Symbolizer } from "../symbolizer/index.ts";
import { Lexer } from "../lexer/index.ts";
import { Parser } from "./parser.ts";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, Identifier, LogicalExpression, MemberExpression, NodeType, NumericLiteral, ObjectDeclaration, OtherwiseExpression, ParserValue, Program, SetComprehensionExpression, UnaryExpression, VariableDeclaration, VariableType } from "./model/index.ts";

export class ParserUtil {

    /**
     * Converts a generic AST node to source code
     * 
     * @param ast generic AST node to convert
     * @returns source code of the generic AST node
     */
    public static astToCode(ast: ParserValue): string {
        let code = "";

        switch (ast.type) {
            case NodeType.Program: {
                const program = ast as Program;

                code += program.body.map(declaration => `${ParserUtil.astToCode(declaration)}\n\n`);
                break;
            }
            case NodeType.ObjectDeclaration: {
                const objectDeclaration = ast as ObjectDeclaration;

                const identifier = objectDeclaration.identifier;
                const count = ParserUtil.astToCode(objectDeclaration.count);

                code += `agent ${identifier} ${count} {\n`;
                code += objectDeclaration.body.map(declaration => `\t${ParserUtil.astToCode(declaration)}`).join("\n");
                code += `\n}`;

                break;
            }
            case NodeType.VariableDeclaration: {
                const variableDeclaration = ast as VariableDeclaration;
                code += variableDeclaration.variableType === VariableType.Const ? "const" : "property";
                code += " " + variableDeclaration.identifier;
                if (variableDeclaration.default) {
                    code += ": " + ParserUtil.astToCode(variableDeclaration.default);
                }
                code += " = ";
                code += ParserUtil.astToCode(variableDeclaration.value);
                code += ";";
                break;
            }
            case NodeType.NumericLiteral: {
                const numericLiteral = ast as NumericLiteral;
                code += numericLiteral.value;
                break;
            }
            case NodeType.BooleanLiteral: {
                const booleanLiteral = ast as BooleanLiteral;
                code += booleanLiteral.value;
                break;
            }
            case NodeType.Identifier: {
                const identifier = ast as Identifier;
                code += identifier.identifier;
                break;
            }
            case NodeType.BinaryExpression: {
                const binaryExpression = ast as BinaryExpression;

                const operator = binaryExpression.operator;
                let left = ParserUtil.astToCode(binaryExpression.left);
                let right = ParserUtil.astToCode(binaryExpression.right);

                if (ParserUtil.isOfType(binaryExpression.left, NodeType.BinaryExpression, NodeType.LogicalExpression, NodeType.ConditionalExpression)) {
                    left = `(${left})`;
                }

                if (ParserUtil.isOfType(binaryExpression.right, NodeType.BinaryExpression, NodeType.LogicalExpression, NodeType.ConditionalExpression)) {
                    right = `(${right})`;
                }

                code += `${left} ${operator} ${right}`;
                break;
            }
            case NodeType.UnaryExpression: {
                const unaryExpression = ast as UnaryExpression;
                
                const operator = unaryExpression.operator;
                const value = ParserUtil.astToCode(unaryExpression.value);

                code += `${operator}${value}`;
                break;
            }
            case NodeType.LogicalExpression: {
                const logicalExpression = ast as LogicalExpression;

                const operator = logicalExpression.operator;
                let left = ParserUtil.astToCode(logicalExpression.left);
                let right = ParserUtil.astToCode(logicalExpression.right);

                if (ParserUtil.isOfType(logicalExpression.left, NodeType.BinaryExpression, NodeType.LogicalExpression, NodeType.ConditionalExpression)) {
                    left = `(${left})`;
                }

                if (ParserUtil.isOfType(logicalExpression.right, NodeType.BinaryExpression, NodeType.LogicalExpression, NodeType.ConditionalExpression)) {
                    right = `(${right})`;
                }

                code += `${left} ${operator} ${right}`;
                break;
            }
            case NodeType.ConditionalExpression: {
                const conditionalExpression = ast as ConditionalExpression;

                const condition = ParserUtil.astToCode(conditionalExpression.condition);
                const consequent = ParserUtil.astToCode(conditionalExpression.consequent);
                const alternate = ParserUtil.astToCode(conditionalExpression.alternate);

                code += `if ${condition} then ${consequent} else ${alternate}`;
                break;
            }
            case NodeType.CallExpression: {
                const callExpression = ast as CallExpression;

                const caller = ParserUtil.astToCode(callExpression.caller);
                const args = callExpression.args.map(arg => ParserUtil.astToCode(arg));

                code += `${caller}(${args.join(", ")})`;
                break;
            }
            case NodeType.SetComprehensionExpression: {
                const setComprehensionExpression = ast as SetComprehensionExpression;
                
                const base = ParserUtil.astToCode(setComprehensionExpression.base);
                const param = setComprehensionExpression.param;
                const value = ParserUtil.astToCode(setComprehensionExpression.value);

                code += `${base} => ${param} => ${value}`;
                break;
            }
            case NodeType.MemberExpression: {
                const memberExpression = ast as MemberExpression;
                
                const caller = ParserUtil.astToCode(memberExpression.caller);
                const value = ParserUtil.astToCode(memberExpression.value);

                code += `${caller}.${value}`;
                break;
            }
            case NodeType.OtherwiseExpression: {
                const otherwiseExpression = ast as OtherwiseExpression;

                let left = ParserUtil.astToCode(otherwiseExpression.left);
                let right = ParserUtil.astToCode(otherwiseExpression.right);

                if (ParserUtil.isOfType(otherwiseExpression.left, NodeType.BinaryExpression, NodeType.LogicalExpression, NodeType.ConditionalExpression)) {
                    left = `(${left})`;
                }

                if (ParserUtil.isOfType(otherwiseExpression.right, NodeType.BinaryExpression, NodeType.LogicalExpression, NodeType.ConditionalExpression)) {
                    right = `(${right})`;
                }

                code += `${left} otherwise ${right}`;
                break;
            }
        }

        return code;
    }

    /**
     * Converts the source code to a variable declaration AST node
     * 
     * @param sourceCode source code to convert
     * @returns variable declaration AST node
     */
    public static codeToAst(sourceCode: string): VariableDeclaration {
        const symbols = new Symbolizer(sourceCode).symbolize();
        const tokens = new Lexer(symbols).tokenize();
        const result = new Parser(tokens).parseVariableDeclaration() as VariableDeclaration;
        return result;
    }

    /**
     * Finds a variable declaration AST node in a program AST node and converts it to source code
     * 
     * @param program program AST node to search in
     * @param agentIdentifier identifier of the object declaration
     * @param variableIdentifier identifier of the variable declaration
     * @returns source code of the variable declaration AST node if found, otherwise undefined
     */
    public static getVariableCode(program: Program, agentIdentifier: string, variableIdentifier: string): string | undefined {
        const objectDeclarationStatement = program.body.find(object => (object as ObjectDeclaration).identifier === agentIdentifier);
        
        if (!objectDeclarationStatement) {
            return undefined;
        }
        
        const variableDeclarationStatement = (objectDeclarationStatement as ObjectDeclaration).body.find(variable => (variable as VariableDeclaration).identifier === variableIdentifier);

        if (!variableDeclarationStatement) {
            return undefined;
        }

        return ParserUtil.astToCode(variableDeclarationStatement as VariableDeclaration);
    }

    /**
     * Finds a variable declaration AST node in a program AST node and replaces it with a new variable declaration AST node
     * 
     * @param program program AST node to search in
     * @param newVariableDeclaration variable declaration AST node to use as a replacement
     * @param agentIdentifier identifier of the object declaration
     * @param variableIdentifier identifier of the variable declaration
     * @returns new program AST node with the replaced variable declaration AST node
     */
    public static updateVariableInProgram(program: Program, newVariableDeclaration: VariableDeclaration, agentIdentifier: string, variableIdentifier: string): Program {
        program.body = program.body.map(objectStatement => {
            const objectDeclaration = objectStatement as ObjectDeclaration;

            if (objectDeclaration.identifier === agentIdentifier) {
                objectDeclaration.body = objectDeclaration.body.map(variableStatement => {
                    let variableDeclaration = variableStatement as VariableDeclaration;

                    if (variableDeclaration.identifier === variableIdentifier) {
                        variableDeclaration = newVariableDeclaration;
                    }

                    return variableDeclaration;
                });
            }

            return objectDeclaration;
        });

        return program;
    }

    /**
     * Asserts whether a generic AST node is of any of the given types
     * 
     * @param node generic AST node to assert
     * @param types list of types to assert against
     * @returns true of the given generic AST node is of any of the given types, otherwise false
     */
    private static isOfType(node: ParserValue, ...types: NodeType[]): boolean {
        for (const type of types) {
            if (node.type === type) {
                return true;
            }
        }

        return false;
    }
}