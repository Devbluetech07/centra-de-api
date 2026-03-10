package utilidades

import "time"

func AgoraRFC3339() string {
	return time.Now().Format(time.RFC3339)
}
