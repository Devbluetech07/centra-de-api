-- nome: deletar_usuario
-- descricao: Remove usuário por ID
-- parametros: $1 = id
-- retorna: sem retorno
DELETE FROM usuarios
WHERE id = $1;
