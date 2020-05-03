import Statement from "./statement";
import Expression from "../expression/expression";
import CodeBuilder from "../../scope/code_builder";
import NodeInfo from "../../scope/node_info";
import { TypeFactory, ErrorType, JType } from "../../scope/type";
import { BlockScope } from "../../scope/scope";

function translateStr(codeBuilder: CodeBuilder, str: string) {
  codeBuilder.setTranslatedCode(`# Inicio de cadena\n`);
  let tempStart = codeBuilder.getNewTemporary();
  codeBuilder.setTranslatedCode(`${tempStart} = H;\n`);
  for (let i = 0; i < str.length; i++) {
    codeBuilder.setTranslatedCode(`Heap[H] = ${str.charCodeAt(i)};\n`);
    codeBuilder.setTranslatedCode("H = H + 1;\n");
  }
  codeBuilder.setTranslatedCode(`Heap[H] = 0;\n`);
  codeBuilder.setTranslatedCode("H = H + 1;\n");
  codeBuilder.setTranslatedCode(`# Fin de cadena\n`);
  codeBuilder.setLastAddress(tempStart);
}

export abstract class Declaration extends Statement {}

export class VarDeclaration extends Declaration {
  public constructor(
    nodeInfo: NodeInfo,
    public isConstant: boolean,
    public identifier: string,
    public exp: Expression
  ) {
    super(nodeInfo);
  }

  public createScope(typeFactory: TypeFactory, scope: BlockScope): void {}

  public checkScope(typeFactory: TypeFactory, scope: BlockScope): void {
    this.exp.verifyType(typeFactory, scope);
    let type = this.exp.type;
    if (type instanceof ErrorType) {
      scope.addError(type);
    }
    let ok = scope.createVariableLocal(this.identifier, type, this.isConstant);
    if (!ok) {
      scope.addError(
        new ErrorType(
          `Error la variable ${this.identifier} ya fue declarada.`,
          this.nodeInfo
        )
      );
    }
  }

  public translate(
    typeFactory: TypeFactory,
    codeBuilder: CodeBuilder,
    scope: BlockScope
  ): void {}
}

export class VarDeclarationGlobal extends Declaration {
  public constructor(
    nodeInfo: NodeInfo,
    public identifier: string,
    public exp: Expression
  ) {
    super(nodeInfo);
  }

  public createScope(typeFactory: TypeFactory, scope: BlockScope): void {
    this.exp.verifyType(typeFactory, scope);
    let type = this.exp.type;
    if (type instanceof ErrorType) {
      scope.addError(type);
    }
    let globalScope = scope.getGlobal();
    let ok = globalScope.createVariableLocal(this.identifier, type, false);
    if (!ok) {
      let variable = globalScope.getVariableLocal(this.identifier);
      if (!variable.type.isEquals(type)) {
        scope.addError(
          new ErrorType(
            `Error la variable global ${this.identifier} tiene multiples declaraciones con diferentes tipos.`,
            this.nodeInfo
          )
        );
      }
    }
  }

  public checkScope(typeFactory: TypeFactory, scope: BlockScope): void {}

  public translate(
    typeFactory: TypeFactory,
    codeBuilder: CodeBuilder,
    scope: BlockScope
  ): void {
    this.exp.translate(typeFactory, codeBuilder, scope);
    let globalScope = scope.getGlobal();
    let variable = globalScope.getVariableLocal(this.identifier);
    let t1 = codeBuilder.getNewTemporary();
    let LV = codeBuilder.getNewLabel();
    let LF = codeBuilder.getNewLabel();
    codeBuilder.setTranslatedCode(`${t1} = Heap[${variable.ptr + 1}];
if (${t1} == 1) goto ${LV};`);
    if (typeFactory.isBoolean(this.exp.type)) {
      let dir = codeBuilder.getNewTemporary();
      codeBuilder.printFalseLabels();
      codeBuilder.setTranslatedCode(`${dir} = 0;`);
      let LS = codeBuilder.getNewLabel();
      codeBuilder.setTranslatedCode(`goto ${LS};\n`);
      codeBuilder.printTrueLabels();
      codeBuilder.setTranslatedCode(`${dir} = 1;\n${LS}:\n`);
      codeBuilder.setTranslatedCode(`
Heap[${variable.ptr}] = ${dir};
Heap[${variable.ptr + 1}] = 1;
`);
    } else {
      codeBuilder.setTranslatedCode(`
Heap[${variable.ptr}] = ${codeBuilder.getLastAddress()};
Heap[${variable.ptr + 1}] = 1;
`);
    }
    codeBuilder.setTranslatedCode(`goto ${LF};\n${LV}:\n`);
    let t2 = codeBuilder.getNewTemporary();
    let t3 = codeBuilder.getNewTemporary();
    codeBuilder.setTranslatedCode(
      `${t2} = P + 4; # Cambio simulado de ambito\n`
    );
    translateStr(codeBuilder, this.nodeInfo.filename);
    codeBuilder.setTranslatedCode(
      `${t3} = ${t2} + 0;\nStack[${t3}] = ${codeBuilder.getLastAddress()};\n`
    );
    codeBuilder.setTranslatedCode(
      `${t3} = ${t2} + 1;\nStack[${t3}] = ${this.nodeInfo.line};\n`
    );
    codeBuilder.setTranslatedCode(
      `${t3} = ${t2} + 2;\nStack[${t3}] = ${this.nodeInfo.column};\n`
    );
    translateStr(codeBuilder, this.identifier);
    codeBuilder.setTranslatedCode(
      `${t3} = ${t2} + 3;\nStack[${t3}] = ${codeBuilder.getLastAddress()};\n`
    );
    codeBuilder.setTranslatedCode(
      `P = P + 4;\ncall native_print_global_variable_error;\nP = P - 4;\nE = 0;\n`
    );
    codeBuilder.setTranslatedCode(`${LF}:\n`);
  }
}

export class VarDeclarationType extends Declaration {
  public constructor(
    nodeInfo: NodeInfo,
    public type: JType,
    public idList: Array<string>,
    public exp?: Expression
  ) {
    super(nodeInfo);
  }

  public createScope(typeFactory: TypeFactory, scope: BlockScope): void {}

  public checkScope(typeFactory: TypeFactory, scope: BlockScope): void {
    this.exp.verifyType(typeFactory, scope);
    let typeExp = this.exp.type;
    if (typeExp instanceof ErrorType) {
      scope.addError(typeExp);
    }
    let verify =
      (typeFactory.isDouble(this.type) && typeFactory.isNumeric(typeExp)) ||
      (typeFactory.isInteger(this.type) &&
        (typeFactory.isInteger(typeExp) || typeFactory.isChar(typeExp))) ||
      this.type.isEquals(typeExp);
    if (!verify) {
      scope.addError(
        new ErrorType(
          `Error no se puede asignar una expresion de tipo ${typeExp} en una declaracion de variables de tipo ${this.type}.`,
          this.nodeInfo
        )
      );
    }
    let ok: boolean;
    for (let identifier of this.idList) {
      ok = scope.createVariableLocal(identifier, this.type, false);
      if (!ok) {
        scope.addError(
          new ErrorType(
            `Error la variable ${identifier} ya fue declarada.`,
            this.nodeInfo
          )
        );
      }
    }
  }

  public translate(
    typeFactory: TypeFactory,
    codeBuilder: CodeBuilder,
    scope: BlockScope
  ): void {}
}
