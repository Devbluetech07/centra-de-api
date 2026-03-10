-- nome: obter_usuario_por_id
-- descricao: Busca usuário por ID
-- parametros: $1 = id do usuário
-- retorna: dados do usuário
SELECT id, email, nome_completo, hash_senha, ativo, data_criacao, data_atualizacao
FROM usuarios
WHERE id = $1;
