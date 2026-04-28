// Minimal type declaration for `braintree-web-drop-in`.
//
// The published @types/braintree-web-drop-in package on npm is stale
// and won't resolve at install time, so we hand-roll just enough types
// here to satisfy the strict TypeScript build on Vercel. We only need
// .create() and the two instance methods we actually use.

declare module 'braintree-web-drop-in' {
  export interface DropinCreateOptions {
    authorization: string;
    container: HTMLElement | string;
    card?: {
      cardholderName?: {
        required?: boolean;
      };
    };
    paypal?: {
      flow?: 'vault' | 'checkout';
      [key: string]: unknown;
    };
    // Allow any additional options the SDK supports without us listing
    // every one — keeps this declaration minimal but flexible.
    [key: string]: unknown;
  }

  export interface DropinInstance {
    requestPaymentMethod(): Promise<{ nonce: string; type: string }>;
    teardown(): Promise<void>;
    on(event: string, handler: (...args: unknown[]) => void): void;
  }

  const dropin: {
    create(options: DropinCreateOptions): Promise<DropinInstance>;
  };

  export default dropin;
}
