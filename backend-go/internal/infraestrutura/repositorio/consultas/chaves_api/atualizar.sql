-- nome: atualizar_chave_api
-- descricao: Atualiza nome e status da chave de API
-- parametros: $1 = nome, $2 = ativo, $3 = id, $4 = owner_token_hash
-- retorna: sem retorno
UPDATE chaves_api
SET nome = $1,
    ativo = $2
WHERE id = $3
  AND owner_token_hash = $4;
