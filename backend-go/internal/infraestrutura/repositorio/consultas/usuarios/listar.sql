-- nome: listar_usuarios
-- descricao: Lista usuários com paginação
-- parametros: $1 = limite, $2 = deslocamento
-- retorna: lista de usuários
SELECT id, email, nome_completo, hash_senha, ativo, data_criacao, data_atualizacao
FROM usuarios
ORDER BY data_criacao DESC
LIMIT $1 OFFSET $2;
