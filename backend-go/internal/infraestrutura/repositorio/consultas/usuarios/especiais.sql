-- nome: obter_usuario_por_email
-- descricao: Busca usuário por email
-- parametros: $1 = email
-- retorna: dados do usuário
SELECT id, email, nome_completo, hash_senha, ativo, data_criacao, data_atualizacao
FROM usuarios
WHERE email = $1;

-- nome: existe_email_usuario
-- descricao: Verifica existência de email
-- parametros: $1 = email
-- retorna: boolean
SELECT EXISTS(
    SELECT 1 FROM usuarios WHERE email = $1
) AS existe;
