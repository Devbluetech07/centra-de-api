-- nome: inserir_chave_api
-- descricao: Insere nova chave de API
-- parametros: $1 = id, $2 = nome, $3 = prefixo, $4 = chave_hash, $5 = owner_token_hash
-- retorna: sem retorno
INSERT INTO chaves_api (id, nome, prefixo, chave_hash, owner_token_hash, ativo, data_criacao)
VALUES ($1, $2, $3, $4, $5, TRUE, NOW());
