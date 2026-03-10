-- nome: deletar_captura
-- descricao: Remove captura
-- parametros: $1 = id, $2 = token_hash
-- retorna: sem retorno
DELETE FROM registros_captura
WHERE id = $1
  AND token_hash = $2;
