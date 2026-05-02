export class ValidationError extends Error {
  name = 'ValidationError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class OpenAIError extends Error {
  name = 'OpenAIError';

  constructor(
    message: string,
    public statusCode: number,
    public userMessage: string,
    public code?: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, OpenAIError.prototype);
  }
}
