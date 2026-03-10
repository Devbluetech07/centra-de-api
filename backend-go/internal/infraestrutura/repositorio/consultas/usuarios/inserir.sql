-- nome: inserir_usuario
-- descricao: Insere um novo usuário
-- parametros: $1 = id, $2 = email, $3 = nome_completo, $4 = hash_senha
-- retorna: sem retorno
INSERT INTO usuarios (id, email, nome_completo, hash_senha, ativo, data_criacao, data_atualizacao)
VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW());
