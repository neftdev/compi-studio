import { AstNode } from "../ast_node";
import { JType, TypeFactory } from "../../scope/type";
import { BlockScope } from "../../scope/scope";

export default abstract class Expression extends AstNode {
  public type: JType;
  public abstract verifyType(typeFactory: TypeFactory, scope: BlockScope): void;
}
