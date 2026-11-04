import { api } from '../lib/api';

export interface PincodeLocation {
  city: string;
  state: string;
  country: string;
}

/**
 * Auto-fetches country, state, and city from a 6-digit Indian Postal/PIN code.
 * Queries backend first (with DB cache), and falls back directly to the official Postal PIN API.
 */
export async function fetchLocationByPincode(pincode: string): Promise<PincodeLocation | null> {
  const pin = (pincode || '').trim().replace(/\D/g, '');
  if (pin.length !== 6) return null;

  // 1. Query backend postal-codes endpoint
  try {
    const res = await api.get(`/postal-codes/${pin}`);
    if (res.data && res.data.city && res.data.state) {
      return {
        city: res.data.city,
        state: res.data.state,
        country: res.data.country || 'India',
      };
    }
  } catch (err) {
    // Backend lookup failed or network hiccup; fall through to client direct fetch
  }

  // 2. Client direct fallback
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    if (res.ok) {
      const data = await res.json();
      if (
        Array.isArray(data) &&
        data[0] &&
        data[0].Status === 'Success' &&
        Array.isArray(data[0].PostOffice) &&
        data[0].PostOffice.length > 0
      ) {
        const po = data[0].PostOffice[0];
        return {
          city: po.District || po.Block || po.Circle || po.Name || '',
          state: po.State || '',
          country: po.Country || 'India',
        };
      }
    }
  } catch (err) {
    console.warn('Direct postal API fallback failed:', err);
  }

  return null;
}
