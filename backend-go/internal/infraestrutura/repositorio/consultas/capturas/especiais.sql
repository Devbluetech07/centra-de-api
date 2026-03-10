-- nome: listar_capturas
-- descricao: Lista capturas por token hash com paginação
-- parametros: $1 = token_hash, $2 = tipo_servico, $3 = limite, $4 = deslocamento
-- retorna: lista de capturas
SELECT id, tipo_servico, status, image_data, metadados, criado_em
FROM registros_captura
WHERE token_hash = $1
  AND ($2 = '' OR tipo_servico = $2)
ORDER BY criado_em DESC
LIMIT $3 OFFSET $4;
