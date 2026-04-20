export const COOKIE_NAME = 'e_auction_token';

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000
};