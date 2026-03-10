-- nome: atualizar_status_captura
-- descricao: Atualiza status de captura
-- parametros: $1 = status, $2 = id, $3 = token_hash
-- retorna: sem retorno
UPDATE registros_captura
SET status = $1
WHERE id = $2
  AND token_hash = $3;
