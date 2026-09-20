export interface Logger {
  info(data: object, message: string): void;
  warn(data: object, message: string): void;
  error(data: object, message: string): void;
}
