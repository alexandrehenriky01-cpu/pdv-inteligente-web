export function gerarUrlGoogleMaps(
  origem: string,
  destino: string,
  waypoints?: string[]
): string {
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('origin', encodeURIComponent(origem));
  params.set('destination', encodeURIComponent(destino));

  if (waypoints && waypoints.length > 0) {
    params.set('waypoints', waypoints.map((w) => encodeURIComponent(w)).join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function gerarUrlGoogleMapsPorCoordenadas(
  origemLat: number,
  origemLng: number,
  destinoLat?: number,
  destinoLng?: number
): string {
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('origin', `${origemLat},${origemLng}`);

  if (destinoLat && destinoLng) {
    params.set('destination', `${destinoLat},${destinoLng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function abrirGoogleMaps(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function abrirRotaDelivery(origem: string, destino: string, waypoints?: string[]): void {
  const url = gerarUrlGoogleMaps(origem, destino, waypoints);
  abrirGoogleMaps(url);
}
