-- nome: existe_email_usuario
-- descricao: Verifica existência de email
-- parametros: $1 = email
-- retorna: boolean
SELECT EXISTS(
    SELECT 1 FROM usuarios WHERE email = $1
) AS existe;
