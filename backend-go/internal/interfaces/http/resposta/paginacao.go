package resposta

// Paginacao representa metadados de paginação.
type Paginacao struct {
	Limite      int `json:"limite"`
	Deslocamento int `json:"deslocamento"`
	Total       int `json:"total"`
}
