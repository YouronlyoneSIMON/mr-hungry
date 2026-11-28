import { HttpInterceptorFn } from '@angular/common/http';
import { getToken } from './auth-session';
import { API_URL } from './config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getToken();

  // Only attach the token to our own backend
  if (token && req.url.startsWith(API_URL)) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req);
};