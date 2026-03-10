-- nome: atualizar_usuario
-- descricao: Atualiza dados do usuário
-- parametros: $1 = nome_completo, $2 = ativo, $3 = data_atualizacao, $4 = id
-- retorna: sem retorno
UPDATE usuarios
SET nome_completo = $1,
    ativo = $2,
    data_atualizacao = $3
WHERE id = $4;
