package dto

// CriarUsuarioEntrada representa payload de criação de usuário.
type CriarUsuarioEntrada struct {
	Email        string `json:"email"`
	NomeCompleto string `json:"nome_completo"`
	Senha        string `json:"senha"`
}

// UsuarioSaida representa usuário retornado na API.
type UsuarioSaida struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	NomeCompleto string `json:"nome_completo"`
	Ativo        bool   `json:"ativo"`
	DataCriacao  string `json:"data_criacao"`
}
