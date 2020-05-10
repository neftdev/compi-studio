import Access from "./access";
import { TypeFactory, StructureType, ErrorType } from "../../../scope/type";
import CodeTranslator from "../../../scope/code_builder";
import { BlockScope } from "../../../scope/scope";
import NodeInfo from "../../../scope/node_info";

export default class AttributeAccess extends Access {
  private dir: number;

  public constructor(
    nodeInfo: NodeInfo,
    public exp: Access,
    public identifier: string
  ) {
    super(nodeInfo);
    this.dir = -1;
  }

  public verifyType(typeFactory: TypeFactory, scope: BlockScope): void {
    this.exp.verifyType(typeFactory, scope);
    let type = this.exp.type;
    if (type instanceof StructureType && type.structure) {
      let structure = type.structure;
      let count = 0;
      for (let attribute of structure.attributeList) {
        if (this.identifier === attribute.identifier) {
          this.dir = count;
          break;
        }
        count++;
      }
      if (this.dir === -1) {
        this.type = new ErrorType(
          `Error no existe el atributo ${this.identifier} en la estructura ${structure.identifier}.`,
          this.nodeInfo
        );
      } else {
        this.type = structure.attributeList[this.dir].type;
        this.dir += 1;
        this.itsHeap = true;
      }
    } else {
      this.type = new ErrorType(
        `Error la expresion dada no es una estructura.`,
        this.nodeInfo
      );
    }
  }

  public translate(
    typeFactory: TypeFactory,
    codeBuilder: CodeTranslator,
    scope: BlockScope
  ): void {
    this.exp.translate(typeFactory, codeBuilder, scope);
    let lastDir = codeBuilder.getLastAddress();
    let t1 = codeBuilder.getNewTemporary(),
      t2 = codeBuilder.getNewTemporary();
    codeBuilder.setTranslatedCode(`${t1} = Heap[${lastDir}];
${t2} = ${t1} + ${this.dir};
`);
    codeBuilder.setLastAddress(t2);
  }
}