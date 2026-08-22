import { authenticator } from 'otplib';

authenticator.options = {
  step: 30,
  digits: 6,
  window: 1, // ±1 time step tolerance
};

const ISSUER = 'Swiss Bank';

export const totpService = {
  generateSecret() {
    return authenticator.generateSecret();
  },

  otpAuthUri(secret, accountEmail) {
    return authenticator.keyuri(accountEmail, ISSUER, secret);
  },

  verify(secret, code) {
    if (!secret || !code || !/^[0-9]{6}$/.test(code)) {
      return false;
    }
    try {
      return authenticator.check(code, secret);
    } catch {
      return false;
    }
  },
};

export default totpService;
