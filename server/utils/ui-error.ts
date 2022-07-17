import { HttpError } from 'routing-controllers';

export default class UIError extends HttpError {
  constructor(message: string) {
    super(200);
    this.name = 'UIError';
    this.message = message;
  }
}
