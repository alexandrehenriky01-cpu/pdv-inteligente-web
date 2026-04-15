/**
 * Inicializa o Datadog Browser RUM apenas quando credenciais estão definidas no .env do build.
 * Evita chamadas a `init` e erros de rede/console quando o cliente não configurou monitoramento.
 */
function isConfiguredNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function initDatadogBrowserRum(): void {
  const applicationIdRaw = import.meta.env.VITE_DATADOG_APPLICATION_ID;
  const clientTokenRaw = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;

  if (!isConfiguredNonEmpty(applicationIdRaw) || !isConfiguredNonEmpty(clientTokenRaw)) {
    return;
  }

  const applicationId = applicationIdRaw.trim();
  const clientToken = clientTokenRaw.trim();

  void import('@datadog/browser-rum')
    .then(({ datadogRum }) => {
      const siteRaw = import.meta.env.VITE_DATADOG_SITE;
      const site = isConfiguredNonEmpty(siteRaw) ? siteRaw.trim() : 'datadoghq.com';

      const serviceRaw = import.meta.env.VITE_DATADOG_SERVICE;
      const service = isConfiguredNonEmpty(serviceRaw) ? serviceRaw.trim() : 'aurya-pdv-web';

      datadogRum.init({
        applicationId,
        clientToken,
        site: site as import('@datadog/browser-rum').Site,
        service,
        env: import.meta.env.MODE,
        sessionSampleRate: 100,
        sessionReplaySampleRate: 0,
        trackUserInteractions: true,
        defaultPrivacyLevel: 'mask-user-input',
      });
    })
    .catch(() => {
      /* Pacote ausente ou falha de rede: não registrar no console em produção */
    });
}
