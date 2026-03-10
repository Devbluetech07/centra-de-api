-- nome: obter_captura_por_id
-- descricao: Busca captura por id e token hash
-- parametros: $1 = id, $2 = token_hash
-- retorna: captura
SELECT id, tipo_servico, status, image_data, metadados, criado_em
FROM registros_captura
WHERE id = $1 AND token_hash = $2;
