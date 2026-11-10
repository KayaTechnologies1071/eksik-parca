/**
 * Mobil (Capacitor iOS / Android) ve Web ortamları için merkezi API & WebSocket yapılandırması.
 * Mobil uygulama paketlendiğinde (APK / IPA) varsayılan olarak canlı Render bulut sunucusuna
 * (https://eksik-parca.onrender.com) bağlanır; çevrimdışıysa yerel + Supabase Edge motoruna düşer.
 */

const CUSTOM_SERVER_KEY = 'eksik_parca_custom_server';
export const DEFAULT_CLOUD_SERVER_URL = 'https://eksik-parca.onrender.com';

function isCapacitorNativeWebView(): boolean {
  if (typeof window === 'undefined') return false;
  const proto = window.location.protocol;
  if (proto === 'capacitor:' || proto === 'file:') return true;
  // Capacitor Android WebView runs on https://localhost or http://localhost without a port
  if (window.location.hostname === 'localhost' && !window.location.port) {
    return true;
  }
  return false;
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(CUSTOM_SERVER_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (isCapacitorNativeWebView()) {
    return DEFAULT_CLOUD_SERVER_URL;
  }
  return '';
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path}`;
}

export function buildWsUrl(): string {
  const base = getApiBaseUrl();
  if (base) {
    const wsBase = base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    return `${wsBase}/ws`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function setCustomServerUrl(url: string) {
  const clean = url.trim();
  if (!clean) {
    localStorage.removeItem(CUSTOM_SERVER_KEY);
  } else {
    localStorage.setItem(CUSTOM_SERVER_KEY, clean);
  }
}

export function getCustomServerUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CUSTOM_SERVER_KEY) || '';
}
