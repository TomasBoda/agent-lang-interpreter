import { TokenType } from "./model/index.ts";

export const ReservedKeywords: Record<string, TokenType> = {
    "agent": TokenType.Agent,

    "define": TokenType.Define,
    "property": TokenType.Property,
    "const": TokenType.Const,
    
    "if": TokenType.If,
    "then": TokenType.Then,
    "else": TokenType.Else,

    "and": TokenType.RelationalOperator,
    "or": TokenType.RelationalOperator,

    "true": TokenType.Boolean,
    "false": TokenType.Boolean,

    "otherwise": TokenType.Otherwise,
}