INSERT INTO api_keys (api_key, ai_type, is_free, owner_info) VALUES
('AIzaSyCCkrmFdn432HZvVAXhJlpFF3mStQXwqzs', 'google', 1, 'danbidad@gmail.com'),
('AIzaSyAz-aTT8aIHj43pyVBHtHRQ3R_zctewo3E', 'google', 1, 'danbidad2@gmail.com'),
('AIzaSyD9CZJuVTxAjk9y3P0pFLKPQYomR7q5JLs', 'google', 1, 'han3sung@gmail.com')
ON CONFLICT(api_key) DO NOTHING;

/*
INSERT INTO api_keys (api_key, ai_type, is_free, owner_info) VALUES
('AIzaSyAa-PvlxqjIbRLKfymRAg1HlsrU9C0A1Ls', 'google', 1, 'danbidad@gmail.com'),
('AIzaSyDaAR2kKBeqizeRvmDGVlKqKECck4vfpzg', 'google', 1, 'danbidad2@gmail.com'),
('AIzaSyCI_f6tkOqD9br4rrXGzMF_RJ1xiub0IyI', 'google', 1, 'han3sung@gmail.com')
ON CONFLICT(api_key) DO NOTHING;
*/
