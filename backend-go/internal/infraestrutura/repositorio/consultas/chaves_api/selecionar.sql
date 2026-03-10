-- nome: obter_chave_api_por_id
-- descricao: Busca chave por ID e token hash dono
-- parametros: $1 = id, $2 = token hash dono
-- retorna: dados da chave
SELECT id, nome, prefixo, chave_hash, owner_token_hash, ativo, data_criacao
FROM chaves_api
WHERE id = $1 AND owner_token_hash = $2;
