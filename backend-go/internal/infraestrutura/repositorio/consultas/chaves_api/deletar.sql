-- nome: deletar_chave_api
-- descricao: Remove chave por id e dono
-- parametros: $1 = id, $2 = owner_token_hash
-- retorna: sem retorno
DELETE FROM chaves_api
WHERE id = $1
  AND owner_token_hash = $2;
