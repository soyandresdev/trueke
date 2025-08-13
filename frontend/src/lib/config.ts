/** Origen de la API. En desarrollo es el mismo del frontend (Vite hace de proxy a Django). */
export const apiBaseUrl: string = import.meta.env.VITE_API_URL || window.location.origin
