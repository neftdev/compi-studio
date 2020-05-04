import CodeTranslator from "../scope/code_builder";

export default class NativeStringFunctions {
  public static readonly _instance: NativeStringFunctions = new NativeStringFunctions();

  private constructor() {}

  public generete(codeBuilder: CodeTranslator) {
    this.concatStringString(codeBuilder);
  }

  private concatStringString(codeBuilder: CodeTranslator) {
    codeBuilder.setTranslatedCode("");
  }

  public static getInstance(): NativeStringFunctions {
    return NativeStringFunctions._instance;
  }
}
