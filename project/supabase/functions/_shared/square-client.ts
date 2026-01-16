interface SquareRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface SquareResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

export class SquareClient {
  private accessToken: string;
  private environment: 'production' | 'sandbox';
  private baseUrl: string;
  private squareVersion = '2024-01-18';

  constructor() {
    this.accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN') || '';
    this.environment = (Deno.env.get('SQUARE_ENV') || 'production') as 'production' | 'sandbox';

    if (!this.accessToken) {
      throw new Error('SQUARE_ACCESS_TOKEN environment variable is not set');
    }

    this.baseUrl = this.environment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareup.dev';
  }

  async request<T>(
    endpoint: string,
    options: SquareRequestOptions = {}
  ): Promise<SquareResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
    } = options;

    const url = new URL(endpoint, this.baseUrl).toString();

    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Square-Version': this.squareVersion,
      'Content-Type': 'application/json',
      ...headers,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.errors?.[0]?.detail ||
          responseData.message ||
          `Square API error: ${response.status}`;
        return { data: null, error: errorMessage };
      }

      return { data: responseData as T, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: `Request failed: ${errorMessage}` };
    }
  }

  async createPayment(payload: {
    source_id: string;
    amount_money: {
      amount: number;
      currency: string;
    };
    location_id: string;
    idempotency_key: string;
    note?: string;
    customer_id?: string;
    reference_id?: string;
  }): Promise<SquareResponse<unknown>> {
    return this.request('/v2/payments', {
      method: 'POST',
      body: payload,
    });
  }

  async retrievePayment(paymentId: string): Promise<SquareResponse<unknown>> {
    return this.request(`/v2/payments/${paymentId}`, {
      method: 'GET',
    });
  }

  async listPayments(
    beginTime?: string,
    endTime?: string,
    sortOrder?: 'ASC' | 'DESC',
    cursor?: string
  ): Promise<SquareResponse<unknown>> {
    const params = new URLSearchParams();
    if (beginTime) params.append('begin_time', beginTime);
    if (endTime) params.append('end_time', endTime);
    if (sortOrder) params.append('sort_order', sortOrder);
    if (cursor) params.append('cursor', cursor);

    const endpoint = params.toString()
      ? `/v2/payments?${params.toString()}`
      : '/v2/payments';

    return this.request(endpoint, { method: 'GET' });
  }

  async createCustomer(payload: {
    given_name?: string;
    family_name?: string;
    email_address?: string;
    phone_number?: string;
    address?: {
      address_line_1?: string;
      address_line_2?: string;
      locality?: string;
      administrative_district_level_1?: string;
      postal_code?: string;
      country?: string;
    };
    note?: string;
  }): Promise<SquareResponse<unknown>> {
    return this.request('/v2/customers', {
      method: 'POST',
      body: payload,
    });
  }

  async retrieveCustomer(customerId: string): Promise<SquareResponse<unknown>> {
    return this.request(`/v2/customers/${customerId}`, {
      method: 'GET',
    });
  }

  async createOrder(payload: {
    idempotency_key?: string;
    order?: {
      location_id: string;
      line_items?: Array<{
        quantity: string;
        catalog_object_id?: string;
        name?: string;
        base_price_money?: {
          amount: number;
          currency: string;
        };
      }>;
      customer_id?: string;
      discount_money?: {
        amount: number;
        currency: string;
      };
    };
  }): Promise<SquareResponse<unknown>> {
    return this.request('/v2/orders', {
      method: 'POST',
      body: payload,
    });
  }

  async retrieveOrder(orderId: string): Promise<SquareResponse<unknown>> {
    return this.request(`/v2/orders/${orderId}`, {
      method: 'GET',
    });
  }

  getEnvironment(): string {
    return this.environment;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
