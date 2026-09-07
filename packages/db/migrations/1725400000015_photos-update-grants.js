/**
 * Grant UPDATE on photos metadata columns to app_owner for the media worker.
 * Photos content is immutable (SEC-03) but the media worker populates
 * server-side fields (sha256, thumbnail, size, OCR result) after upload.
 */

exports.up = (pgm) => {
  pgm.sql(`
    GRANT UPDATE (sha256_server, s3_key_thumb, size_bytes, ocr_result)
    ON tenant.photos TO app_owner;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    REVOKE UPDATE (sha256_server, s3_key_thumb, size_bytes, ocr_result)
    ON tenant.photos FROM app_owner;
  `);
};
