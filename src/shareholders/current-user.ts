export class CurrentUser {
  private static readonly instance = new CurrentUser();

  readonly id = 1;

  private constructor() {}

  static getInstance(): CurrentUser {
    return CurrentUser.instance;
  }
}