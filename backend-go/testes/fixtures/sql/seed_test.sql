INSERT INTO usuarios (id, email, nome_completo, hash_senha, ativo, data_criacao, data_atualizacao)
VALUES ('11111111-1111-1111-1111-111111111111', 'teste@valeris.local', 'Usuário Teste', 'hash', TRUE, NOW(), NOW())
ON CONFLICT DO NOTHING;
