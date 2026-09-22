import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request-scoped context for database transactions.
 *
 * The JWT guard populates `req.user` *after* the request enters the app, so
 * the store holds the request object itself and consumers read `user`
 * lazily at query time. Used to stamp `app.user_id` for fn_audit triggers.
 */
export type RequestContext = { user?: unknown };

export const requestStore = new AsyncLocalStorage<RequestContext>();
