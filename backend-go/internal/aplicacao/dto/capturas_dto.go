package dto

// CriarCapturaEntrada representa payload de criação de captura.
type CriarCapturaEntrada struct {
	TipoServico string         `json:"service_type"`
	ImagemBase64 string        `json:"image_data"`
	Metadados   map[string]any `json:"metadata"`
}

// CapturaSaida representa resposta de captura.
type CapturaSaida struct {
	ID          string         `json:"id"`
	TipoServico string         `json:"service_type"`
	Status      string         `json:"status"`
	ImageData   string         `json:"image_data"`
	Metadados   map[string]any `json:"metadata"`
	CriadoEm    string         `json:"created_at"`
}
