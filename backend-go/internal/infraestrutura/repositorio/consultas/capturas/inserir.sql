-- nome: inserir_captura
-- descricao: Insere captura no histórico
-- parametros: $1 = id, $2 = token_hash, $3 = tipo_servico, $4 = status, $5 = image_data, $6 = metadados
-- retorna: sem retorno
INSERT INTO registros_captura (id, token_hash, tipo_servico, status, image_data, metadados, criado_em)
VALUES ($1, $2, $3, $4, $5, $6, NOW());
