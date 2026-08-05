import os from 'os';
import { getHardwareFingerprint, saveActivationToken, loadActivationToken, deleteActivationToken } from './security';
import config from './config.json';

const PORTAL_URL = process.env.MAGICCAM_PORTAL_URL || config.portalUrl || 'http://localhost:3001';

export interface ActivationResponse {
  success: boolean;
  message: string;
  plan?: string;
  expirationDate?: string | null;
}

/**
 * Communicates with the web portal to register and activate the device license
 */
export async function activateLicense(email: string, licenseKey: string): Promise<ActivationResponse> {
  const hardwareFingerprint = getHardwareFingerprint();
  const deviceName = os.hostname() || 'Workstation';
  const osName = os.type();
  const osVersion = os.release();

  try {
    const res = await fetch(`${PORTAL_URL}/api/desktop/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        licenseKey,
        hardwareFingerprint,
        deviceName,
        osName,
        osVersion,
      }),
    });

    const data = await res.json();
    if (res.ok && data.activationToken) {
      saveActivationToken(data.activationToken);
      return {
        success: true,
        message: data.message || 'License activated successfully.',
        plan: data.plan,
        expirationDate: data.expirationDate,
      };
    } else {
      return {
        success: false,
        message: data.error || 'Failed to activate license key.',
      };
    }
  } catch (error: any) {
    console.error('Activation network error:', error);
    return {
      success: false,
      message: 'Network connection failed. Make sure the portal server is running.',
    };
  }
}

/**
 * Checks if local activation token is valid against the license server
 */
export async function validateLicenseOnline(): Promise<{ valid: boolean; error?: string }> {
  const token = loadActivationToken();
  if (!token) return { valid: false, error: 'No activation token found locally.' };

  const hardwareFingerprint = getHardwareFingerprint();
  
  // Extract license key dynamically from token or fetch verification endpoint
  // Our validate endpoint requires licenseKey, fingerprint, and the activationToken
  // We can decode the token or retrieve it if we stored the key, but to verify it securely:
  // Let's decode the payload (our token is a standard signed JWT, we can split it to read the JSON payload without verifying yet)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed activation token.' };
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    
    // Payload role matches 'activation:key:fingerprint'
    const roleProof = payload.role || '';
    const match = roleProof.match(/^activation:(MC-[A-Z0-9-]{19}):/);
    if (!match) return { valid: false, error: 'Invalid activation role payload.' };
    const licenseKey = match[1];

    const res = await fetch(`${PORTAL_URL}/api/desktop/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        hardwareFingerprint,
        activationToken: token,
      }),
    });

    const data = await res.json();
    if (res.ok && data.valid) {
      return { valid: true };
    } else {
      // License suspended, expired, or un-bound
      deleteActivationToken();
      return { valid: false, error: data.error || 'Activation has been suspended or revoked.' };
    }
  } catch (e) {
    console.error('Online license validation error:', e);
    // If server is offline, return true as offline grace period fallback,
    // or return false depending on strict online requirements. Here we allow offline grace period.
    return { valid: true }; // offline grace period fallback
  }
}

/**
 * Remove local license token file
 */
export function deactivateLicenseLocal(): void {
  deleteActivationToken();
}
