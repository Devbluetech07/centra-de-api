package logger

import "log"

// Info registra log informativo.
func Info(mensagem string, args ...any) {
	log.Printf("[INFO] "+mensagem, args...)
}

// Erro registra log de erro.
func Erro(mensagem string, args ...any) {
	log.Printf("[ERRO] "+mensagem, args...)
}
