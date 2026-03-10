package dto

// CriarChaveAPIEntrada representa payload de criação de chave.
type CriarChaveAPIEntrada struct {
	Nome string `json:"nome"`
}

// ChaveAPISaida representa resposta de chave de api.
type ChaveAPISaida struct {
	ID         string `json:"id"`
	Nome       string `json:"nome"`
	Prefixo    string `json:"prefixo"`
	Ativo      bool   `json:"ativo"`
	DataCriacao string `json:"data_criacao"`
}
