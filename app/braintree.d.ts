// Minimal type declaration for the `braintree` server SDK.
//
// The braintree npm package ships its own runtime but its bundled
// TypeScript types aren't picked up by Next.js's strict build, and
// the @types/braintree package on npm is stale. Hand-rolling just
// enough types here to satisfy the strict TypeScript build on Vercel.
//
// We use permissive `any`-shaped return types for API responses since
// Braintree's Result objects are union-shaped (success vs error) and
// we narrow them at the call site with `if (!result.success)` checks.

declare module 'braintree' {
  namespace braintree {
    class BraintreeGateway {
      constructor(config: {
        environment: unknown;
        merchantId: string;
        publicKey: string;
        privateKey: string;
      });

      customer: {
        create(params: Record<string, unknown>): Promise<{
          success: boolean;
          customer: { id: string; [key: string]: unknown };
          message?: string;
          [key: string]: unknown;
        }>;
        find(customerId: string): Promise<{ id: string; [key: string]: unknown }>;
      };

      clientToken: {
        generate(params: { customerId?: string }): Promise<{
          success: boolean;
          clientToken: string;
          message?: string;
        }>;
      };

      paymentMethod: {
        create(params: {
          customerId: string;
          paymentMethodNonce: string;
          options?: Record<string, unknown>;
        }): Promise<{
          success: boolean;
          paymentMethod: { token: string; [key: string]: unknown };
          message?: string;
        }>;
      };

      subscription: {
        create(params: {
          paymentMethodToken: string;
          planId: string;
          [key: string]: unknown;
        }): Promise<{
          success: boolean;
          subscription: {
            id: string;
            status?: string;
            nextBillingDate?: string | Date;
            firstBillingDate?: string | Date;
            [key: string]: unknown;
          };
          message?: string;
        }>;
        cancel(subscriptionId: string): Promise<{
          success: boolean;
          subscription?: { id: string; status?: string; [key: string]: unknown };
          message?: string;
        }>;
        find(subscriptionId: string): Promise<{
          id: string;
          status?: string;
          [key: string]: unknown;
        }>;
      };

      webhookNotification: {
        parse(signature: string, payload: string): Promise<{
          kind: string;
          subscription?: {
            id: string;
            status?: string;
            nextBillingDate?: string | Date;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        }>;
      };

      transaction: {
        sale(params: Record<string, unknown>): Promise<{
          success: boolean;
          transaction?: { id: string; status?: string; [key: string]: unknown };
          message?: string;
        }>;
      };
    }

    const Environment: {
      Production: unknown;
      Sandbox: unknown;
    };

    // Loose alias types for callers that want to type their own
    // variables — kept permissive because the SDK's real shapes are
    // union-heavy and we narrow at the call site.
    type Subscription = {
      id: string;
      status?: string;
      [key: string]: unknown;
    };
    type Customer = {
      id: string;
      [key: string]: unknown;
    };
  }

  export = braintree;
}
