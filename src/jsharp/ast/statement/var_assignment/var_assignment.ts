import Statement from "../statement";
import NodeInfo from "../../../scope/node_info";
import Expression from "../../expression/expression";
import { TypeFactory, ErrorType } from "../../../scope/type";
import { BlockScope } from "../../../scope/scope";
import CodeTranslator from "../../../scope/code_builder";
import Access from "./access";
import IdentifierAccess from "./identifier_access";
import Ast from "../../ast";

export default class VarAssignment extends Statement {
  public constructor(
    nodeInfo: NodeInfo,
    public access: Access,
    public exp: Expression
  ) {
    super(nodeInfo);
  }

  public createScope(typeFactory: TypeFactory, scope: BlockScope): void {}

  public checkScope(typeFactory: TypeFactory, scope: BlockScope): void {
    this.access.verifyType(typeFactory, scope);
    let type1 = this.access.type;
    if (type1 instanceof ErrorType) {
      scope.addError(type1);
    }
    if (this.access instanceof IdentifierAccess) {
      if (this.access.isConstant) {
        scope.addError(
          new ErrorType(
            `Error no se le puede asignar un nuevo valor a la variable ${this.access.identifier} ya que es una constante.`,
            this.nodeInfo
          )
        );
      }
    }
    this.exp.verifyType(typeFactory, scope);
    let type2 = this.exp.type;
    if (type2 instanceof ErrorType) {
      scope.addError(type2);
    }

    let verifyType =
      (typeFactory.isDouble(type1) && typeFactory.isNumeric(type2)) ||
      (typeFactory.isInteger(type1) &&
        (typeFactory.isInteger(type2) || typeFactory.isChar(type2))) ||
      type1.isEquals(type2);
    if (!verifyType) {
      scope.addError(
        new ErrorType(
          `Error no se puede asignar una expresion de tipo ${type2} a una variable de tipo ${type1}.`,
          this.nodeInfo
        )
      );
    }
  }

  public translate(
    typeFactory: TypeFactory,
    codeBuilder: CodeTranslator,
    scope: BlockScope
  ): void {
    this.access.translate(typeFactory, codeBuilder, scope);
    let dirAccess = codeBuilder.getLastAddress();
    this.exp.translate(typeFactory, codeBuilder, scope);
    let dirExp: string;
    if (typeFactory.isBoolean(this.exp.type)) {
      dirExp = codeBuilder.getNewTemporary();
      codeBuilder.printFalseLabels();
      codeBuilder.setTranslatedCode(`${dirExp} = 0;`);
      let LS = codeBuilder.getNewLabel();
      codeBuilder.setTranslatedCode(`goto ${LS};\n`);
      codeBuilder.printTrueLabels();
      codeBuilder.setTranslatedCode(`${dirExp} = 1;\n${LS}:\n`);
    } else {
      dirExp = codeBuilder.getLastAddress();
    }
    if (this.access.itsHeap) {
      codeBuilder.setTranslatedCode(`Heap[${dirAccess}] = ${dirExp};\n`);
    } else {
      codeBuilder.setTranslatedCode(`Stack[${dirAccess}] = ${dirExp};\n`);
    }
    codeBuilder.removeUnusedTemporary(dirAccess);
    codeBuilder.removeUnusedTemporary(dirExp);
  }

  getAstNode(ast: Ast, str: Array<string>): number {
    const NUM = ast.contNodes++;
    let t: number = this.access.getAstNode(ast, str);
    str.push(`node${NUM}[label="Asignacion"];
  node${NUM} -> node${t};
`);
    t = this.exp.getAstNode(ast, str);
    str.push(`node${NUM} -> node${t};\n`);
    return NUM;
  }
}
