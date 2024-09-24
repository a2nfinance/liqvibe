package main

import (
	"flag"
	"fmt"
	volatile "liqvibe-prover/circuits"
	"os"

	"github.com/brevis-network/brevis-sdk/sdk/prover"
)

var port = flag.Uint("port", 33247, "the port to start the service at")

// example usage: prover -service="totalfee" -port=33248
func main() {
	flag.Parse()

	proverService, err := prover.NewService(&volatile.AppCircuit{}, prover.ServiceConfig{
		SetupDir: "$HOME/circuitOut",
		SrsDir:   "$HOME/kzgsrs",
	})
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	proverService.Serve("", *port)
}
