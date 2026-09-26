/**
 * Invited users could never sign in.
 *
 * POST /v1/users/invite only INSERTs into tenant.users, while login reads
 * tenant.user_credentials — the table that register() is the sole writer of.
 * An invited user therefore always failed with 401 "Invalid credentials", and
 * there is no password-reset endpoint to recover.
 *
 * Add a single-use invite token so the invitee can set their own password via
 * POST /v1/auth/accept-invite. Only the SHA-256 digest is stored, so a leak of
 * the DB does not yield usable invite links.
 */

exports.up = (pgm) => {
  pgm.addColumn({ name: 'users', schema: 'tenant' }, {
    invite_token_hash: { type: 'text' },
    invite_expires_at: { type: 'timestamptz' },
  });

  // Partial index: most rows are NULL, and accept-invite is an exact lookup.
  pgm.createIndex(
    { name: 'users', schema: 'tenant' },
    ['invite_token_hash'],
    { unique: true, where: 'invite_token_hash IS NOT NULL' },
  );
};

exports.down = (pgm) => {
  pgm.dropIndex({ name: 'users', schema: 'tenant' }, ['invite_token_hash']);
  pgm.dropColumn({ name: 'users', schema: 'tenant' }, 'invite_expires_at');
  pgm.dropColumn({ name: 'users', schema: 'tenant' }, 'invite_token_hash');
};
