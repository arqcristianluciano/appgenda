declare namespace google {
  namespace accounts {
    namespace id {
      interface CredentialResponse {
        credential: string
        select_by: string
      }
      interface IdConfiguration {
        client_id: string
        callback: (response: CredentialResponse) => void
        auto_select?: boolean
        cancel_on_tap_outside?: boolean
      }
      function initialize(config: IdConfiguration): void
      function prompt(momentListener?: (n: unknown) => void): void
      function renderButton(parent: HTMLElement, options: Record<string, unknown>): void
      function disableAutoSelect(): void
    }
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken: (overrideConfig?: { prompt?: string }) => void
      }
      interface TokenResponse {
        access_token: string
        error?: string
        expires_in: number
        scope: string
        token_type: string
      }
      function initTokenClient(config: {
        client_id: string
        scope: string
        hint?: string
        callback: (response: TokenResponse) => void
      }): TokenClient
      function revoke(token: string, callback: () => void): void
    }
  }
}
