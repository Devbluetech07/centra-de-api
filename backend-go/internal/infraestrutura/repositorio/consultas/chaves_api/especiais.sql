-- nome: listar_chaves_api_por_token_hash
-- descricao: Lista chaves por token hash dono
-- parametros: $1 = owner_token_hash
-- retorna: lista de chaves
SELECT id, nome, prefixo, chave_hash, owner_token_hash, ativo, data_criacao
FROM chaves_api
WHERE owner_token_hash = $1
ORDER BY data_criacao DESC;
