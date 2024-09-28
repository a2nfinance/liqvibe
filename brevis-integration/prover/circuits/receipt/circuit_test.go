package volatile_receipt

import (
	"math/big"
	"testing"

	"github.com/brevis-network/brevis-sdk/sdk"
	"github.com/brevis-network/brevis-sdk/test"
	"github.com/ethereum/go-ethereum/common"
)

// In this example, we want to analyze the `Swap` events emitted by Uniswap's
// UniversalRouter contract. Let's declare the fields we want to use:

func TestCircuit(t *testing.T) {
	app, err := sdk.NewBrevisApp()
	check(err)

	pancakeSwapPoolAddress := common.HexToAddress("0x35148b7baf354585a8f3283908bAECf9d14e24b6")

	app.AddReceipt(sdk.ReceiptData{
		BlockNum: big.NewInt(41388224),
		TxHash:   common.HexToHash("0xcee6cc9f36421c7ab81df88ec97bb84706af0b210aa833d93b384b725e85cff5"),
		Fields: [sdk.NumMaxLogFields]sdk.LogFieldData{
			{
				Contract:   pancakeSwapPoolAddress,
				LogIndex:   81,
				EventID:    common.HexToHash("0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83"),
				FieldIndex: 3,
				IsTopic:    false,
				Value:      common.HexToHash("0x0a30d4a443374fb6090363e2b436"),
			},
		},
	})
	app.AddReceipt(sdk.ReceiptData{
		BlockNum: big.NewInt(41388224),
		TxHash:   common.HexToHash("0xcee6cc9f36421c7ab81df88ec97bb84706af0b210aa833d93b384b725e85cff5"),
		Fields: [sdk.NumMaxLogFields]sdk.LogFieldData{
			{
				Contract:   pancakeSwapPoolAddress,
				LogIndex:   55,
				EventID:    common.HexToHash("0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83"),
				FieldIndex: 3,
				IsTopic:    false,
				Value:      common.HexToHash("0x0a30d4e706fb914e8f2e8f3838ed"),
			},
		},
	})
	// Initialize our AppCircuit and prepare the circuit assignment
	appCircuit := &AppCircuit{}
	appCircuitAssignment := &AppCircuit{}

	// Execute the added queries and package the query results into circuit inputs
	in, err := app.BuildCircuitInput(appCircuit)
	check(err)

	///////////////////////////////////////////////////////////////////////////////
	// Testing
	///////////////////////////////////////////////////////////////////////////////

	// Use the test package to check if the circuit can be solved using the given
	// assignment
	test.ProverSucceeded(t, appCircuit, appCircuitAssignment, in)
}

func check(err error) {
	if err != nil {
		panic(err)
	}
}
