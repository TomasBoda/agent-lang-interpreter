import { Symbolizer, Symbol } from "../symbolizer";
import { Lexer, Token } from "../lexer";
import { Parser, BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, Identifier, LambdaExpression, LogicalExpression, MemberExpression, NodeType, NumericLiteral, ObjectDeclaration, OtherwiseExpression, ParserValue, Program, UnaryExpression, VariableDeclaration, VariableType, DefineDeclaration } from "../parser";

export class Formatter {

    private static line = 1
    private static binaryOperatorPrecedence: { [key: string]: number } = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };
    private static logicalOperatorPrecedence: { [key: string]: number } = { "and": 1, "or": 2 };

    public static getFormatted(sourceCode: string): string {
        Formatter.line = 1;

        const program: Program = Formatter.getProgram(sourceCode);
        return Formatter.nodeToSourceCode(program)
    }

    public static nodeToSourceCode(ast: ParserValue): string {
        let sourceCode = "";

        switch (ast.type) {
            case NodeType.Program: {
                const program = ast as Program;

                for (const statement of program.body) {
                    const objectDeclaration = statement as ObjectDeclaration;
                    sourceCode += Formatter.align(objectDeclaration.position.line);
                    sourceCode += Formatter.nodeToSourceCode(objectDeclaration);
                }

                break;
            }
            case NodeType.DefineDeclaration: {
                const defineDeclaration = ast as DefineDeclaration;
                const { identifier } = defineDeclaration;

                sourceCode += `define ${identifier} = ${Formatter.nodeToSourceCode(defineDeclaration.value)};`;

                break;
            }
            case NodeType.ObjectDeclaration: {
                const objectDeclaration = ast as ObjectDeclaration;
                const { identifier, count } = objectDeclaration;

                sourceCode += `agent ${identifier} ${Formatter.nodeToSourceCode(count)} {`;

                for (const statement of objectDeclaration.body) {
                    const variableDeclaration = statement as VariableDeclaration;
                    sourceCode += Formatter.align(variableDeclaration.position.line);
                    sourceCode += `    ${Formatter.nodeToSourceCode(variableDeclaration)}`;
                }

                sourceCode += `\n}`

                break;
            }
            case NodeType.VariableDeclaration: {
                const variableDeclaration = ast as VariableDeclaration;
                const { variableType, identifier } = variableDeclaration;

                sourceCode += `${variableType} ${identifier}`;
                
                if (variableDeclaration.default) {
                    sourceCode += `: ${Formatter.nodeToSourceCode(variableDeclaration.default)}`
                }

                sourceCode += ` = ${Formatter.nodeToSourceCode(variableDeclaration.value)};`;

                break;
            }
            case NodeType.BinaryExpression: {
                const binaryExpression = ast as BinaryExpression;
                const { operator } = binaryExpression;

                let left = Formatter.nodeToSourceCode(binaryExpression.left);
                let right = Formatter.nodeToSourceCode(binaryExpression.right);

                // handle left parentheses
                if (binaryExpression.left.type === NodeType.BinaryExpression) {
                    const needsLeftParentheses = Formatter.binaryOperatorPrecedence[operator] > Formatter.binaryOperatorPrecedence[(binaryExpression.left as BinaryExpression).operator];
                    left = needsLeftParentheses ? `(${left})` : left;
                }

                // handle right parentheses
                if (binaryExpression.right.type === NodeType.BinaryExpression) {
                    const needsLeftParentheses = Formatter.binaryOperatorPrecedence[operator] > Formatter.binaryOperatorPrecedence[(binaryExpression.right as BinaryExpression).operator];
                    right = needsLeftParentheses ? `(${right})` : right;
                }

                sourceCode += `${left} ${operator} ${right}`;
                break;
            }
            case NodeType.UnaryExpression: {
                const unaryExpression = ast as UnaryExpression;
                const { operator } = unaryExpression;

                const value = Formatter.nodeToSourceCode(unaryExpression.value);

                sourceCode += `${operator}${value}`;
                break;
            }
            case NodeType.LogicalExpression: {
                const logicalExpression = ast as LogicalExpression;
                const { operator } = logicalExpression;

                let left = Formatter.nodeToSourceCode(logicalExpression.left);
                let right = Formatter.nodeToSourceCode(logicalExpression.right);

                if (logicalExpression.left.type !== NodeType.LogicalExpression && logicalExpression.right.type === NodeType.LogicalExpression) {
                    right = `(${right})`;
                } else if (logicalExpression.left.type === NodeType.LogicalExpression && logicalExpression.right.type !== NodeType.LogicalExpression) {
                    // Do nothing
                } else {
                    // handle left parentheses
                    if (logicalExpression.left.type === NodeType.LogicalExpression) {
                        const needsLeftParentheses = Formatter.logicalOperatorPrecedence[operator] > Formatter.logicalOperatorPrecedence[(logicalExpression.left as LogicalExpression).operator];
                        left = needsLeftParentheses ? `(${left})` : left;
                    }

                    // handle right parentheses
                    if (logicalExpression.right.type === NodeType.LogicalExpression) {
                        const needsLeftParentheses = Formatter.logicalOperatorPrecedence[operator] > Formatter.logicalOperatorPrecedence[(logicalExpression.right as LogicalExpression).operator];
                        right = needsLeftParentheses ? `(${right})` : right;
                    }
                }

                sourceCode += `${left} ${operator} ${right}`;
                break;
            }
            case NodeType.ConditionalExpression: {
                const conditionalExpression = ast as ConditionalExpression;

                const condition = Formatter.nodeToSourceCode(conditionalExpression.condition);
                const consequent = Formatter.nodeToSourceCode(conditionalExpression.consequent);
                const alternate = Formatter.nodeToSourceCode(conditionalExpression.alternate);

                sourceCode += `if ${condition} then ${consequent} else ${alternate}`;
                break;
            }
            case NodeType.CallExpression: {
                const callExpression = ast as CallExpression;

                const caller = Formatter.nodeToSourceCode(callExpression.caller);
                const args = callExpression.args.map(arg => Formatter.nodeToSourceCode(arg));

                sourceCode += `${caller}(${args.join(", ")})`;
                break;
            }
            case NodeType.LambdaExpression: {
                const lambdaExpression = ast as LambdaExpression;
                
                const base = Formatter.nodeToSourceCode(lambdaExpression.base);
                const param = lambdaExpression.param;
                const value = Formatter.nodeToSourceCode(lambdaExpression.value);

                sourceCode += `${base} => ${param} => ${value}`;
                break;
            }
            case NodeType.MemberExpression: {
                const memberExpression = ast as MemberExpression;
                
                const caller = Formatter.nodeToSourceCode(memberExpression.caller);
                const value = Formatter.nodeToSourceCode(memberExpression.value);

                sourceCode += `${caller}.${value}`;
                break;
            }
            case NodeType.OtherwiseExpression: {
                const otherwiseExpression = ast as OtherwiseExpression;

                let left = Formatter.nodeToSourceCode(otherwiseExpression.left);
                let right = Formatter.nodeToSourceCode(otherwiseExpression.right);

                sourceCode += `${left} otherwise ${right}`;
                break;
            }
            case NodeType.NumericLiteral: {
                const numericLiteral = ast as NumericLiteral;
                const { value } = numericLiteral;
                sourceCode += value;
                break;
            }
            case NodeType.BooleanLiteral: {
                const booleanLiteral = ast as BooleanLiteral;
                const { value } = booleanLiteral;
                sourceCode += value;
                break;
            }
            case NodeType.Identifier: {
                const identifierLiteral = ast as Identifier;
                const { identifier } = identifierLiteral;
                sourceCode += identifier;
                break;
            }
        }

        return sourceCode;
    }

    private static align(line: number): string {
        let offset = "";

        while (Formatter.line < line) {
            Formatter.line++;
            offset += "\n";
        }

        return offset;
    }

    private static getProgram(sourceCode: string): Program {
        const symbolizer: Symbolizer = new Symbolizer(sourceCode);
        const symbols: Symbol[] = symbolizer.symbolize();

        const lexer: Lexer = new Lexer(symbols);
        const tokens: Token[] = lexer.tokenize();

        const parser: Parser = new Parser(tokens);
        const program: Program = parser.parse();

        return program;
    }
}